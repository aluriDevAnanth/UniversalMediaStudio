import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import {
  getAppRoot,
  getPortableDataDir,
  getDatabasePath,
  getLegacyDatabasePath,
  getBundlesDir,
  getTempDir,
  getTempProcessingDir,
} from "../src/main/paths";

describe("Application Paths & Storage Hierarchy (src/main/paths.ts)", () => {
  const originalEnv = process.env.UMS_USER_DATA_DIR;
  let testTempDir: string;

  beforeEach(() => {
    testTempDir = path.join(os.tmpdir(), `ums_paths_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testTempDir, { recursive: true });
    process.env.UMS_USER_DATA_DIR = testTempDir;
  });

  afterEach(() => {
    delete process.env.UMS_USER_DATA_DIR;
    if (originalEnv) {
      process.env.UMS_USER_DATA_DIR = originalEnv;
    }
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it("should return the workspace root or execution root from getAppRoot()", () => {
    const root = getAppRoot();
    expect(typeof root).toBe("string");
    expect(root.length).toBeGreaterThan(0);
    expect(fs.existsSync(root)).toBe(true);
  });

  it("should respect UMS_USER_DATA_DIR override in getPortableDataDir()", () => {
    const dataDir = getPortableDataDir();
    expect(dataDir).toBe(path.resolve(testTempDir));
    expect(fs.existsSync(dataDir)).toBe(true);
  });

  it("should fallback to root/data when UMS_USER_DATA_DIR is unset", () => {
    delete process.env.UMS_USER_DATA_DIR;
    const dataDir = getPortableDataDir();
    const expected = path.join(getAppRoot(), "data");
    expect(dataDir).toBe(expected);
    expect(fs.existsSync(dataDir)).toBe(true);
  });

  it("should return the encrypted SQLite database path inside data dir", () => {
    const dbPath = getDatabasePath();
    expect(dbPath).toBe(path.join(testTempDir, "database.sqlite.enc"));
  });

  it("should return the legacy JSON database path inside data dir", () => {
    const legacyPath = getLegacyDatabasePath();
    expect(legacyPath).toBe(path.join(testTempDir, "mediahub_store.json"));
  });

  it("should return and automatically create the bundles directory", () => {
    const bundlesDir = getBundlesDir();
    expect(bundlesDir).toBe(path.join(testTempDir, "bundles"));
    expect(fs.existsSync(bundlesDir)).toBe(true);
  });

  it("should return and automatically create the temp working directory", () => {
    const tempDir = getTempDir();
    expect(tempDir).toBe(path.join(testTempDir, "temp"));
    expect(fs.existsSync(tempDir)).toBe(true);
  });

  it("should return and automatically create isolated processing scratchpads for video tasks", () => {
    const videoId = "test_vid_12345";
    const procDir = getTempProcessingDir(videoId);
    expect(procDir).toBe(path.join(testTempDir, "temp", `temp_${videoId}`));
    expect(fs.existsSync(procDir)).toBe(true);
  });
});
