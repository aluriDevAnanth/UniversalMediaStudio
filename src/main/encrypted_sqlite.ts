import fs from "fs";
import path from "path";
import crypto from "crypto";
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from "sql.js";

const MAGIC_HEADER = Buffer.from("ADAUSQL1", "utf-8"); // 8 bytes
const PBKDF2_ITERATIONS = 100_000;
const KEY_LEN = 32; // 256 bits
const SALT_LEN = 32; // 256 bits
const IV_LEN = 12; // 96 bits for GCM
const TAG_LEN = 16; // 128-bit auth tag

export interface EncryptedVaultMeta {
  hasPassword: boolean;
  isUnlocked: boolean;
}

export interface SchemaMigration {
  version: number;
  name: string;
  up: (db: SqlJsDatabase) => void;
}

const MIGRATIONS: SchemaMigration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: (db) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          duration REAL NOT NULL,
          resolution TEXT NOT NULL,
          tags TEXT NOT NULL,
          bundle_path TEXT NOT NULL,
          created_at TEXT NOT NULL,
          play_count INTEGER DEFAULT 0,
          last_watched_at TEXT,
          file_size INTEGER
        );
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);`);

      db.run(`
        CREATE TABLE IF NOT EXISTS playlists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          is_default INTEGER DEFAULT 0,
          video_ids TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS tag_metadata (
          tag TEXT PRIMARY KEY,
          color TEXT NOT NULL,
          category TEXT
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS category_colors (
          category TEXT PRIMARY KEY,
          color TEXT NOT NULL
        );
      `);
    },
  },
];

export class EncryptedSQLiteEngine {
  private filePath: string;
  private SQL: SqlJsStatic | null = null;
  private db: SqlJsDatabase | null = null;
  private currentKey: Buffer | null = null;
  private currentSalt: Buffer | null = null;
  private isUnlockedState = false;

  constructor(filePath: string) {
    this.filePath = filePath;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
  }

  public async initialize(): Promise<void> {
    if (!this.SQL) {
      this.SQL = await initSqlJs();
    }
  }

  public exists(): boolean {
    return fs.existsSync(this.filePath);
  }

  public hasMasterPassword(): boolean {
    if (!this.exists()) return false;
    try {
      const fd = fs.openSync(this.filePath, "r");
      const header = Buffer.alloc(MAGIC_HEADER.length);
      fs.readSync(fd, header, 0, MAGIC_HEADER.length, 0);
      fs.closeSync(fd);
      return header.equals(MAGIC_HEADER);
    } catch {
      return false;
    }
  }

  public isUnlocked(): boolean {
    return this.isUnlockedState && this.db !== null;
  }

  public getRawDb(): SqlJsDatabase {
    if (!this.db) {
      throw new Error("Encrypted SQLite Database is locked or not initialized.");
    }
    return this.db;
  }

  /**
   * Unlock or initialize encrypted database with the master password.
   * If database does not exist, a new encrypted database is initialized.
   */
  public async unlockWithPassword(password: string): Promise<boolean> {
    await this.initialize();
    if (!this.SQL) throw new Error("SQL.js initialization failed");

    if (!this.exists()) {
      // First time initialization: create new database and encrypt
      const salt = crypto.randomBytes(SALT_LEN);
      const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LEN, "sha512");
      this.currentSalt = salt;
      this.currentKey = key;

      this.db = new this.SQL.Database();
      this.runMigrations();
      this.initDefaultPlaylists();
      this.saveEncrypted();
      this.isUnlockedState = true;
      return true;
    }

    // Read and decrypt existing database
    const fileBuffer = fs.readFileSync(this.filePath);
    if (fileBuffer.length < MAGIC_HEADER.length + SALT_LEN + IV_LEN + TAG_LEN) {
      throw new Error("Invalid or corrupted encrypted database file.");
    }

    const magic = fileBuffer.subarray(0, MAGIC_HEADER.length);
    if (!magic.equals(MAGIC_HEADER)) {
      throw new Error("Invalid encrypted database header.");
    }

    let offset = MAGIC_HEADER.length;
    const salt = fileBuffer.subarray(offset, offset + SALT_LEN);
    offset += SALT_LEN;
    const iv = fileBuffer.subarray(offset, offset + IV_LEN);
    offset += IV_LEN;
    const tag = fileBuffer.subarray(offset, offset + TAG_LEN);
    offset += TAG_LEN;
    const ciphertext = fileBuffer.subarray(offset);

    const derivedKey = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LEN, "sha512");

    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
      decipher.setAuthTag(tag);
      const decryptedSQLiteBinary = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      this.currentSalt = salt;
      this.currentKey = derivedKey;
      this.db = new this.SQL.Database(decryptedSQLiteBinary);
      this.runMigrations();
      this.initDefaultPlaylists();
      this.isUnlockedState = true;
      return true;
    } catch {
      // GCM authentication failed -> Wrong password or tampered ciphertext
      return false;
    }
  }

  /**
   * Run schema migrations in an ACID transaction
   */
  private runMigrations(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const result = this.db.exec("SELECT version FROM schema_migrations ORDER BY version ASC");
    const appliedVersions = new Set<number>();
    if (result.length > 0 && result[0].values) {
      for (const row of result[0].values) {
        appliedVersions.add(row[0] as number);
      }
    }

    for (const m of MIGRATIONS) {
      if (!appliedVersions.has(m.version)) {
        this.db.run("BEGIN TRANSACTION;");
        try {
          m.up(this.db);
          this.db.run(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
            [m.version, m.name, new Date().toISOString()]
          );
          this.db.run("COMMIT;");
        } catch (err) {
          this.db.run("ROLLBACK;");
          console.error(`Migration ${m.version} (${m.name}) failed:`, err);
          throw err;
        }
      }
    }
  }

  private initDefaultPlaylists(): void {
    if (!this.db) return;
    const stmt = this.db.prepare("SELECT id FROM playlists WHERE id = ?");
    stmt.bind(["watch_later"]);
    if (!stmt.step()) {
      this.db.run(
        "INSERT INTO playlists (id, name, is_default, video_ids, created_at) VALUES (?, ?, ?, ?, ?)",
        ["watch_later", "Watch Later", 1, JSON.stringify([]), new Date().toISOString()]
      );
    }
    stmt.free();

    const favStmt = this.db.prepare("SELECT id FROM playlists WHERE id = ?");
    favStmt.bind(["favourite"]);
    if (!favStmt.step()) {
      this.db.run(
        "INSERT INTO playlists (id, name, is_default, video_ids, created_at) VALUES (?, ?, ?, ?, ?)",
        ["favourite", "Favourite", 1, JSON.stringify([]), new Date().toISOString()]
      );
    }
    favStmt.free();
  }

  /**
   * Persists database binary with AES-256-GCM encryption atomically
   */
  public saveEncrypted(): void {
    if (!this.db || !this.currentKey || !this.currentSalt) {
      return;
    }

    const sqliteBinary = Buffer.from(this.db.export());
    const salt = this.currentSalt;
    const iv = crypto.randomBytes(IV_LEN);

    const cipher = crypto.createCipheriv("aes-256-gcm", this.currentKey, iv);
    const ciphertext = Buffer.concat([cipher.update(sqliteBinary), cipher.final()]);
    const tag = cipher.getAuthTag();

    const outputBuffer = Buffer.concat([
      MAGIC_HEADER, // 8 bytes
      salt,         // 32 bytes
      iv,           // 12 bytes
      tag,          // 16 bytes
      ciphertext,   // SQLite binary encrypted payload
    ]);

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }

    const tempFile = `${this.filePath}.tmp_${Date.now()}`;
    fs.writeFileSync(tempFile, outputBuffer);
    fs.renameSync(tempFile, this.filePath);
  }

  public changePassword(_oldPass: string, newPass: string): boolean {
    if (!this.isUnlocked()) return false;
    const newSalt = crypto.randomBytes(SALT_LEN);
    const newKey = crypto.pbkdf2Sync(newPass, newSalt, PBKDF2_ITERATIONS, KEY_LEN, "sha512");
    this.currentSalt = newSalt;
    this.currentKey = newKey;
    this.saveEncrypted();
    return true;
  }
}
