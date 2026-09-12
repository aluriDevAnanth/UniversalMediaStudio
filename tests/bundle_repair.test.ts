import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { BundleRepairManager } from "../src/main/bundle_repair";
import { BundleManager } from "../src/main/bundle_manager";
import { FFmpegProcessor } from "../src/main/ffmpeg_worker";

describe("Bundle Repair & Faststart Optimization (src/main/bundle_repair.ts)", () => {
  let testTempDir: string;
  let origPrepare: any;

  beforeEach(() => {
    testTempDir = path.join(os.tmpdir(), `ums_repair_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testTempDir, { recursive: true });
    origPrepare = FFmpegProcessor.prepareStreamableVideo;
  });

  afterEach(() => {
    FFmpegProcessor.prepareStreamableVideo = origPrepare;
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it("should throw an error when bundle file does not exist", async () => {
    const nonExistent = path.join(testTempDir, "missing.adaumc");
    await expect(BundleRepairManager.optimizeExistingBundle(nonExistent)).rejects.toThrow("Bundle file not found");
  });

  it("should return failure if bundle has no video asset", async () => {
    const bundlePath = path.join(testTempDir, "no_video.adaumc");
    const thumbPath = path.join(testTempDir, "thumb.jpg");
    fs.writeFileSync(thumbPath, "thumbnail bytes");

    await BundleManager.packBundle({
      id: "vid_no_video",
      title: "No Video Bundle",
      duration: 0,
      resolution: "1920x1080",
      tags: [],
      logs: [],
      assets: [{ key: "thumbnail", filePath: thumbPath, mimeType: "image/jpeg" }],
      outputPath: bundlePath,
    });

    const result = await BundleRepairManager.optimizeExistingBundle(bundlePath);
    expect(result.success).toBe(false);
    expect(result.wasOptimized).toBe(false);
    expect(result.message).toContain("No video asset found in bundle");
  });

  it("should detect already optimized bundles without unnecessarily repacking", async () => {
    const bundlePath = path.join(testTempDir, "already_opt.adaumc");
    const vidPath = path.join(testTempDir, "vid.mp4");
    fs.writeFileSync(vidPath, "dummy video content");

    await BundleManager.packBundle({
      id: "vid_already_opt",
      title: "Already Faststart Bundle",
      duration: 10,
      resolution: "1920x1080",
      tags: [],
      logs: [],
      assets: [{ key: "video", filePath: vidPath, mimeType: "video/mp4" }],
      outputPath: bundlePath,
    });

    // Mock prepareStreamableVideo to simulate already optimized video
    FFmpegProcessor.prepareStreamableVideo = async (_id: string, rawIn: string) => {
      return {
        streamablePath: rawIn,
        isTranscoded: false,
        duration: 10,
        resolution: "1920x1080",
        logs: [],
      };
    };

    const result = await BundleRepairManager.optimizeExistingBundle(bundlePath);
    expect(result.success).toBe(true);
    expect(result.wasOptimized).toBe(false);
    expect(result.message).toContain("already faststart optimized");
  });

  it("should optimize and repack bundle in-place when faststart remux is needed", async () => {
    const bundlePath = path.join(testTempDir, "needs_opt.adaumc");
    const vidPath = path.join(testTempDir, "raw_vid.mp4");
    const thumbPath = path.join(testTempDir, "thumb.jpg");
    fs.writeFileSync(vidPath, "original non-faststart video data");
    fs.writeFileSync(thumbPath, "thumbnail image data");

    await BundleManager.packBundle({
      id: "vid_needs_opt",
      title: "Needs Faststart Bundle",
      duration: 20,
      resolution: "1920x1080",
      tags: ["Action"],
      logs: [],
      assets: [
        { key: "video", filePath: vidPath, mimeType: "video/mp4" },
        { key: "thumbnail", filePath: thumbPath, mimeType: "image/jpeg" },
      ],
      outputPath: bundlePath,
    });

    // Mock prepareStreamableVideo returning an optimized file
    FFmpegProcessor.prepareStreamableVideo = async (_id: string, _rawIn: string, outPath: string) => {
      fs.writeFileSync(outPath, "faststart optimized video payload");
      return {
        streamablePath: outPath,
        isTranscoded: true,
        duration: 20,
        resolution: "1920x1080",
        logs: [],
      };
    };

    const result = await BundleRepairManager.optimizeExistingBundle(bundlePath);
    expect(result.success).toBe(true);
    expect(result.wasOptimized).toBe(true);

    // Verify optimized bundle is still valid and readable
    const { metadata } = BundleManager.readMetadata(bundlePath);
    expect(metadata.id).toBe("vid_needs_opt");
    expect(metadata.title).toBe("Needs Faststart Bundle");
    expect(metadata.assets.video).toBeDefined();
    expect(metadata.assets.thumbnail).toBeDefined();
  });
});
