import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { EncryptedSQLiteEngine } from "../src/main/encrypted_sqlite";

describe("Encrypted SQLite Engine & Zero-Knowledge Security", () => {
  let tempDir: string;
  let dbFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "enc_sqlite_test_"));
    dbFilePath = path.join(tempDir, "database.sqlite.enc");
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  });

  it("should create an encrypted SQLite container with AES-256-GCM authenticated ciphertext", async () => {
    const engine = new EncryptedSQLiteEngine(dbFilePath);
    expect(engine.exists()).toBe(false);

    const unlocked = await engine.unlockWithPassword("MasterPass99!");
    expect(unlocked).toBe(true);
    expect(engine.isUnlocked()).toBe(true);
    expect(engine.exists()).toBe(true);

    // Verify on-disk file has ADAUSQL1 magic header and high-entropy ciphertext
    const rawFileBytes = fs.readFileSync(dbFilePath);
    expect(rawFileBytes.subarray(0, 8).toString("utf-8")).toBe("ADAUSQL1");
    // Ensure plain SQLite header 'SQLite format 3' is NOT in the encrypted file
    expect(rawFileBytes.includes(Buffer.from("SQLite format 3"))).toBe(false);
  });

  it("should unlock existing database with correct master password and execute queries", async () => {
    const engine1 = new EncryptedSQLiteEngine(dbFilePath);
    await engine1.unlockWithPassword("VaultKey!2026");

    const rawDb = engine1.getRawDb();
    rawDb.run(
      "INSERT INTO videos (id, title, duration, resolution, tags, bundle_path, created_at, play_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ["vid_sql_1", "Encrypted Farscape Episode 1", 3000, "1920x1080", JSON.stringify(["Sci-Fi"]), "/bundles/ep1.adaumc", new Date().toISOString(), 5]
    );
    engine1.saveEncrypted();

    // Now open a new engine instance simulating app restart
    const engine2 = new EncryptedSQLiteEngine(dbFilePath);
    expect(engine2.isUnlocked()).toBe(false);

    const unlockSuccess = await engine2.unlockWithPassword("VaultKey!2026");
    expect(unlockSuccess).toBe(true);
    expect(engine2.isUnlocked()).toBe(true);

    const stmt = engine2.getRawDb().prepare("SELECT title, play_count FROM videos WHERE id = ?");
    stmt.bind(["vid_sql_1"]);
    expect(stmt.step()).toBe(true);
    const row = stmt.getAsObject();
    expect(row.title).toBe("Encrypted Farscape Episode 1");
    expect(row.play_count).toBe(5);
    stmt.free();
  });

  it("should reject incorrect master password with zero data leakage", async () => {
    const engine1 = new EncryptedSQLiteEngine(dbFilePath);
    await engine1.unlockWithPassword("CorrectPassword123!");

    const rawDb = engine1.getRawDb();
    rawDb.run(
      "INSERT INTO videos (id, title, duration, resolution, tags, bundle_path, created_at, play_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ["secret_vid", "Top Secret Classified Video", 120, "3840x2160", JSON.stringify(["TopSecret"]), "/bundles/secret.adaumc", new Date().toISOString(), 0]
    );
    engine1.saveEncrypted();

    // Attempt unlock with wrong password
    const engine2 = new EncryptedSQLiteEngine(dbFilePath);
    const unlockFail = await engine2.unlockWithPassword("WrongPassword!");
    expect(unlockFail).toBe(false);
    expect(engine2.isUnlocked()).toBe(false);
    expect(() => engine2.getRawDb()).toThrow();
  });

  it("should detect and reject tampered ciphertext via AES-256-GCM auth tag verification", async () => {
    const engine1 = new EncryptedSQLiteEngine(dbFilePath);
    await engine1.unlockWithPassword("PasswordForTamperTest");
    engine1.saveEncrypted();

    // Tamper with a byte in the encrypted file (e.g. modify byte at index 80)
    const rawFileBytes = fs.readFileSync(dbFilePath);
    rawFileBytes[80] ^= 0xff; // flip bits
    fs.writeFileSync(dbFilePath, rawFileBytes);

    const engine2 = new EncryptedSQLiteEngine(dbFilePath);
    const tamperedUnlock = await engine2.unlockWithPassword("PasswordForTamperTest");
    expect(tamperedUnlock).toBe(false);
    expect(engine2.isUnlocked()).toBe(false);
  });

  it("should automatically apply versioned schema migrations in ACID transactions", async () => {
    const engine = new EncryptedSQLiteEngine(dbFilePath);
    await engine.unlockWithPassword("MigrationTestPass");

    const rawDb = engine.getRawDb();
    const res = rawDb.exec("SELECT version, name FROM schema_migrations ORDER BY version ASC");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].values.length).toBeGreaterThanOrEqual(1);
    expect(res[0].values[0][1]).toBe("initial_schema");
  });
});
