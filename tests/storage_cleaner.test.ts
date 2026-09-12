import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { StorageCleaner } from "../src/main/storage_cleaner";
import { db } from "../src/main/db";
import { activeImportTasks } from "../src/main/random_video";

describe("StorageCleaner Background Cleaner", () => {
  let testDataDir: string;
  let bundlesDir: string;
  let tempDir: string;

  beforeEach(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cleaner_test_"));
    process.env.UMS_USER_DATA_DIR = testDataDir;

    bundlesDir = path.join(testDataDir, "bundles");
    tempDir = path.join(testDataDir, "temp");
    fs.mkdirSync(bundlesDir, { recursive: true });
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    delete process.env.UMS_USER_DATA_DIR;
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  it("should preserve active bundles registered in the database", async () => {
    const activeBundleFile = "active_vid_123.adaumc";
    const activeBundlePath = path.join(bundlesDir, activeBundleFile);
    fs.writeFileSync(activeBundlePath, Buffer.alloc(1024 * 1024, 0xaa)); // 1MB

    db.saveVideo({
      id: "vid_123",
      title: "Active Video 1",
      duration: 120,
      resolution: "1920x1080",
      tags: ["Test"],
      bundlePath: activeBundlePath,
      createdAt: new Date().toISOString(),
    });

    const cleaner = new StorageCleaner({ gracePeriodMs: 0 }); // 0 grace period for testing
    const result = await cleaner.cleanOrphansNow();

    expect(fs.existsSync(activeBundlePath)).toBe(true);
    expect(result.deletedBundles.includes(activeBundleFile)).toBe(false);
    expect(result.deletedCount).toBe(0);
    expect(result.freedBytes).toBe(0);

    // Clean up db record
    db.deleteVideo("vid_123");
  });

  it("should delete orphaned bundles older than grace period", async () => {
    const orphanBundleFile = "orphan_vid_999.adaumc";
    const orphanBundlePath = path.join(bundlesDir, orphanBundleFile);
    fs.writeFileSync(orphanBundlePath, Buffer.alloc(2 * 1024 * 1024, 0xbb)); // 2MB

    const cleaner = new StorageCleaner({ gracePeriodMs: 0 });
    const result = await cleaner.cleanOrphansNow();

    expect(fs.existsSync(orphanBundlePath)).toBe(false);
    expect(result.deletedBundles).toContain(orphanBundleFile);
    expect(result.deletedCount).toBe(1);
    expect(result.freedBytes).toBe(2 * 1024 * 1024);
  });

  it("should preserve recently created files within grace period", async () => {
    const recentOrphanFile = "recent_vid_888.adaumc";
    const recentOrphanPath = path.join(bundlesDir, recentOrphanFile);
    fs.writeFileSync(recentOrphanPath, Buffer.alloc(1024 * 1024, 0xcc)); // 1MB

    // Grace period of 1 hour - file was created just now, so it should be protected
    const cleaner = new StorageCleaner({ gracePeriodMs: 3600_000 });
    const result = await cleaner.cleanOrphansNow();

    expect(fs.existsSync(recentOrphanPath)).toBe(true);
    expect(result.deletedBundles.length).toBe(0);
    expect(result.deletedCount).toBe(0);
  });

  it("should preserve files belonging to active in-flight import tasks", async () => {
    const activeTaskId = "vid_task_inflight_777";
    const inFlightBundleFile = `${activeTaskId}.adaumc`;
    const inFlightBundlePath = path.join(bundlesDir, inFlightBundleFile);
    fs.writeFileSync(inFlightBundlePath, Buffer.alloc(512 * 1024, 0xdd));

    activeImportTasks.set(activeTaskId, {
      videoId: activeTaskId,
      isCancelled: false,
    });

    try {
      const cleaner = new StorageCleaner({ gracePeriodMs: 0 });
      const result = await cleaner.cleanOrphansNow();

      expect(fs.existsSync(inFlightBundlePath)).toBe(true);
      expect(result.deletedBundles.includes(inFlightBundleFile)).toBe(false);
    } finally {
      activeImportTasks.delete(activeTaskId);
    }
  });

  it("should clean abandoned temp scratchpad directories", async () => {
    const staleTempDir = path.join(tempDir, "temp_vid_abandoned_444");
    fs.mkdirSync(staleTempDir, { recursive: true });
    fs.writeFileSync(path.join(staleTempDir, "scratch.mp4"), Buffer.alloc(1024, 0x00));

    const cleaner = new StorageCleaner({ gracePeriodMs: 0 });
    const result = await cleaner.cleanOrphansNow();

    expect(fs.existsSync(staleTempDir)).toBe(false);
    expect(result.deletedTempDirs).toContain("temp_vid_abandoned_444");
    expect(result.deletedCount).toBeGreaterThanOrEqual(1);
  });

  it("should start and stop timer properly without throwing", () => {
    const cleaner = new StorageCleaner({ intervalMs: 500 });
    expect(() => cleaner.start()).not.toThrow();
    expect(() => cleaner.stop()).not.toThrow();
  });
});
