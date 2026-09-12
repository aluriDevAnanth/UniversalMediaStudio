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

export function getDefaultMachineKey(): string {
  const os = require("os");
  let user = "default_user";
  try {
    user = os.userInfo().username || "default_user";
  } catch {}
  const machineData = `${os.hostname()}-${user}-${os.platform()}-${os.arch()}-UniversalMediaStudioVaultKey_v1`;
  return crypto.createHash("sha256").update(machineData).digest("hex");
}

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
      let wasmBuffer: Buffer | null = null;
      let wasmPath: string | null = null;

      const candidates: string[] = [];

      try {
        candidates.push(require.resolve("sql.js/dist/sql-wasm.wasm"));
      } catch {}

      candidates.push(
        path.join(__dirname, "sql-wasm.wasm"),
        path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
        path.join(process.cwd(), "out", "main", "sql-wasm.wasm"),
      );

      if (typeof process !== "undefined" && (process as any).resourcesPath) {
        candidates.push(
          path.join((process as any).resourcesPath, "sql-wasm.wasm"),
          path.join(
            (process as any).resourcesPath,
            "app.asar.unpacked",
            "node_modules",
            "sql.js",
            "dist",
            "sql-wasm.wasm",
          ),
        );
      }

      for (const p of candidates) {
        if (p && fs.existsSync(p)) {
          try {
            wasmBuffer = fs.readFileSync(p);
            wasmPath = p;
            break;
          } catch {}
        }
      }

      if (wasmBuffer) {
        this.SQL = await initSqlJs({
          wasmBinary: wasmBuffer.buffer.slice(
            wasmBuffer.byteOffset,
            wasmBuffer.byteOffset + wasmBuffer.byteLength,
          ) as ArrayBuffer,
          locateFile: () => wasmPath || "sql-wasm.wasm",
        });
      } else {
        this.SQL = await initSqlJs();
      }
    }
  }

  public exists(): boolean {
    return fs.existsSync(this.filePath);
  }

  public hasMasterPassword(): boolean {
    return this.hasCustomMasterPassword();
  }

  public hasCustomMasterPassword(): boolean {
    if (!this.exists()) return false;
    if (this.isUnlocked() && this.db) {
      return this.readCustomPasswordFlag(this.db);
    }
    if (this.SQL) {
      try {
        const fileBuffer = fs.readFileSync(this.filePath);
        const defaultPass = getDefaultMachineKey();
        const decrypted = this.decryptBufferWithKey(fileBuffer, defaultPass);
        if (decrypted) {
          const hasCustom = this.readCustomPasswordFlag(decrypted.db);
          decrypted.db.close();
          return hasCustom;
        }
      } catch {}
    }
    return true;
  }

  private readCustomPasswordFlag(db: SqlJsDatabase): boolean {
    try {
      const stmt = db.prepare("SELECT value FROM app_state WHERE key = ?");
      stmt.bind(["has_custom_password"]);
      if (stmt.step()) {
        const row = stmt.getAsObject() as { value: string };
        stmt.free();
        return row.value === "1";
      }
      stmt.free();
    } catch {}
    return false;
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

  private decryptBufferWithKey(
    fileBuffer: Buffer,
    password: string,
  ): { db: SqlJsDatabase; salt: Buffer; key: Buffer } | null {
    if (!this.SQL) return null;
    if (fileBuffer.length < MAGIC_HEADER.length + SALT_LEN + IV_LEN + TAG_LEN) {
      return null;
    }

    const magic = fileBuffer.subarray(0, MAGIC_HEADER.length);
    if (!magic.equals(MAGIC_HEADER)) {
      return null;
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
      const sqlDb = new this.SQL.Database(decryptedSQLiteBinary);
      return { db: sqlDb, salt, key: derivedKey };
    } catch {
      return null;
    }
  }

  /**
   * Automatically initializes or unlocks the encrypted SQLite database.
   * If brand new, initializes with default machine key (has_custom_password = 0).
   * If existing without custom password, unlocks immediately with machine key.
   */
  public async autoInitialize(): Promise<boolean> {
    await this.initialize();
    if (!this.SQL) throw new Error("SQL.js initialization failed");

    if (!this.exists()) {
      const defaultPass = getDefaultMachineKey();
      const salt = crypto.randomBytes(SALT_LEN);
      const key = crypto.pbkdf2Sync(defaultPass, salt, PBKDF2_ITERATIONS, KEY_LEN, "sha512");
      this.currentSalt = salt;
      this.currentKey = key;

      this.db = new this.SQL.Database();
      this.runMigrations();
      this.initDefaultPlaylists();
      this.db.run("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)", [
        "has_custom_password",
        "0",
      ]);
      this.saveEncrypted();
      this.isUnlockedState = true;
      return true;
    }

    const fileBuffer = fs.readFileSync(this.filePath);
    const defaultPass = getDefaultMachineKey();
    const decrypted = this.decryptBufferWithKey(fileBuffer, defaultPass);

    if (decrypted) {
      const hasCustom = this.readCustomPasswordFlag(decrypted.db);
      if (!hasCustom) {
        this.db = decrypted.db;
        this.currentSalt = decrypted.salt;
        this.currentKey = decrypted.key;
        this.runMigrations();
        this.initDefaultPlaylists();
        this.isUnlockedState = true;
        return true;
      } else {
        decrypted.db.close();
        this.isUnlockedState = false;
        return false;
      }
    }

    this.isUnlockedState = false;
    return false;
  }

  /**
   * Unlock or initialize encrypted database with a custom master password.
   */
  public async unlockWithPassword(password: string): Promise<boolean> {
    await this.initialize();
    if (!this.SQL) throw new Error("SQL.js initialization failed");

    if (!this.exists()) {
      return this.setCustomMasterPassword(password);
    }

    const fileBuffer = fs.readFileSync(this.filePath);
    const decrypted = this.decryptBufferWithKey(fileBuffer, password);
    if (decrypted) {
      if (this.db) {
        try {
          this.db.close();
        } catch {}
      }
      this.db = decrypted.db;
      this.currentSalt = decrypted.salt;
      this.currentKey = decrypted.key;
      this.runMigrations();
      this.initDefaultPlaylists();
      this.isUnlockedState = true;
      return true;
    }

    return false;
  }

  /**
   * Sets or upgrades database encryption to a custom user master password.
   */
  public async setCustomMasterPassword(password: string): Promise<boolean> {
    await this.initialize();
    if (!this.SQL) throw new Error("SQL.js initialization failed");

    if (!this.db) {
      if (this.exists()) {
        const fileBuffer = fs.readFileSync(this.filePath);
        const defaultPass = getDefaultMachineKey();
        const decrypted = this.decryptBufferWithKey(fileBuffer, defaultPass);
        if (decrypted) {
          this.db = decrypted.db;
        }
      }
      if (!this.db) {
        this.db = new this.SQL.Database();
      }
      this.runMigrations();
      this.initDefaultPlaylists();
    }

    this.db.run("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)", [
      "has_custom_password",
      "1",
    ]);

    const newSalt = crypto.randomBytes(SALT_LEN);
    const newKey = crypto.pbkdf2Sync(password, newSalt, PBKDF2_ITERATIONS, KEY_LEN, "sha512");
    this.currentSalt = newSalt;
    this.currentKey = newKey;
    this.isUnlockedState = true;
    this.saveEncrypted();
    return true;
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
