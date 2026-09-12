import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import {
  getUserDataDir,
  cancelActiveImport,
  activeImportTasks,
  activeImportFilePaths,
  importVideoFile,
} from "../src/main/random_video";
import { db } from "../src/main/db";

describe("Video Import Pipeline & Cancellation Management (src/main/random_video.ts)", () => {
  let testTempDir: string;
  const origEnv = process.env.UMS_USER_DATA_DIR;

  beforeEach(async () => {
    testTempDir = path.join(os.tmpdir(), `ums_random_vid_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testTempDir, { recursive: true });
    process.env.UMS_USER_DATA_DIR = testTempDir;

    // Reset database with in-memory SQLite
    await db.initialize(":memory:");
  });

  afterEach(() => {
    delete process.env.UMS_USER_DATA_DIR;
    if (origEnv) {
      process.env.UMS_USER_DATA_DIR = origEnv;
    }
    activeImportTasks.clear();
    activeImportFilePaths.clear();
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it("should return valid directory from getUserDataDir() matching environment override", () => {
    const dir = getUserDataDir();
    expect(dir).toBe(testTempDir);
  });

  it("should reject unsupported video file extensions", async () => {
    const invalidFile = path.join(testTempDir, "document.pdf");
    fs.writeFileSync(invalidFile, "fake pdf");

    await expect(importVideoFile(invalidFile)).rejects.toThrow("Unsupported video format: .pdf");
  });

  it("should record active import tasks and cancel tasks on cancelActiveImport()", () => {
    activeImportTasks.set("task_1", { videoId: "task_1", isCancelled: false });
    activeImportTasks.set("task_2", { videoId: "task_2", isCancelled: false });

    // Cancel specific task
    cancelActiveImport("task_1");
    expect(activeImportTasks.get("task_1")?.isCancelled).toBe(true);
    expect(activeImportTasks.get("task_2")?.isCancelled).toBe(false);

    // Cancel all tasks
    cancelActiveImport();
    expect(activeImportTasks.get("task_2")?.isCancelled).toBe(true);
  });

  it("should recognize duplicate files already in library without creating new records", async () => {
    const fakeFile = path.join(testTempDir, "SampleMovie.mp4");
    fs.writeFileSync(fakeFile, "movie binary stream 12345");
    const fileSize = fs.statSync(fakeFile).size;

    // Pre-insert video record into DB
    db.saveVideo({
      id: "vid_existing_123",
      title: "SampleMovie",
      duration: 120,
      resolution: "1920x1080",
      tags: [],
      bundlePath: path.join(testTempDir, "bundles", "vid_existing_123.adaumc"),
      createdAt: new Date().toISOString(),
      fileSize,
    });

    const progressReports: string[] = [];
    const result = await importVideoFile(fakeFile, (p) => {
      if (p.log) progressReports.push(p.log);
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("vid_existing_123");
    expect(progressReports.some((log) => log.includes("already present"))).toBe(true);
  });
});
