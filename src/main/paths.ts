import path from "path";
import fs from "fs";

let electronApp: any = null;
try {
  const electron = require("electron");
  electronApp = electron?.app || electron?.default?.app || null;
} catch {}

/**
 * Returns the base root directory for the portable application.
 * - In packaged portable executable: directory containing the .exe
 * - In dev/node/test runtime: process.cwd() (workspace root)
 */
export function getAppRoot(): string {
  if (electronApp && typeof electronApp.getPath === "function" && electronApp.isPackaged) {
    return path.dirname(electronApp.getPath("exe"));
  }
  return process.cwd();
}

/**
 * Returns the centralized portable data directory: `<root>/data/`
 * Supports UMS_USER_DATA_DIR override for testing and benchmarks.
 */
export function getPortableDataDir(): string {
  if (process.env.UMS_USER_DATA_DIR) {
    const customDir = path.resolve(process.env.UMS_USER_DATA_DIR);
    if (!fs.existsSync(customDir)) {
      try {
        fs.mkdirSync(customDir, { recursive: true });
      } catch {}
    }
    return customDir;
  }

  const dataDir = path.join(getAppRoot(), "data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  return dataDir;
}

/**
 * Returns path to the fully encrypted SQLite database file: `<root>/data/database.sqlite.enc`
 */
export function getDatabasePath(): string {
  return path.join(getPortableDataDir(), "database.sqlite.enc");
}

/**
 * Returns path to legacy JSON database for automatic migration: `<root>/data/mediahub_store.json`
 */
export function getLegacyDatabasePath(): string {
  return path.join(getPortableDataDir(), "mediahub_store.json");
}

/**
 * Returns directory where all .adaumc encrypted video containers are saved: `<root>/data/bundles/`
 */
export function getBundlesDir(): string {
  const bundlesDir = path.join(getPortableDataDir(), "bundles");
  if (!fs.existsSync(bundlesDir)) {
    try {
      fs.mkdirSync(bundlesDir, { recursive: true });
    } catch {}
  }
  return bundlesDir;
}

/**
 * Returns the temporary working directory: `<root>/data/temp/`
 */
export function getTempDir(): string {
  const tempDir = path.join(getPortableDataDir(), "temp");
  if (!fs.existsSync(tempDir)) {
    try {
      fs.mkdirSync(tempDir, { recursive: true });
    } catch {}
  }
  return tempDir;
}

/**
 * Returns an isolated processing scratchpad directory for a specific video task: `<root>/data/temp/temp_<videoId>/`
 */
export function getTempProcessingDir(videoId: string): string {
  const vidTempDir = path.join(getTempDir(), `temp_${videoId}`);
  if (!fs.existsSync(vidTempDir)) {
    try {
      fs.mkdirSync(vidTempDir, { recursive: true });
    } catch {}
  }
  return vidTempDir;
}
