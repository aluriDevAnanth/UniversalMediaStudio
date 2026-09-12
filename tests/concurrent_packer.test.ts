import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { ConcurrentPacker, HEADER_OFFSET } from "../src/main/concurrent_packer";
import { BundleManager } from "../src/main/bundle_manager";

describe("Concurrent Streaming Container Packer (src/main/concurrent_packer.ts)", () => {
  let testTempDir: string;

  beforeEach(() => {
    testTempDir = path.join(os.tmpdir(), `ums_packer_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testTempDir, { recursive: true });
  });

  afterEach(async () => {
    // Give async streams a short moment to release handles
    await new Promise((r) => setTimeout(r, 50));
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it("should initialize bundle with magic bytes ADAUMC and 16KB placeholder header", async () => {
    const bundlePath = path.join(testTempDir, "init_test.adaumc");
    const rawVideoPath = path.join(testTempDir, "init_vid.mp4");
    fs.writeFileSync(rawVideoPath, Buffer.from("test video"));

    const packer = new ConcurrentPacker(bundlePath);
    packer.startPackingVideo(rawVideoPath);

    await packer.finalizeBundle(
      "init_vid_001",
      "Init Video",
      10,
      "1920x1080",
      [],
      ["init log"],
      [],
    );

    expect(fs.existsSync(bundlePath)).toBe(true);
    const fd = fs.openSync(bundlePath, "r");
    const magicBuf = Buffer.alloc(6);
    fs.readSync(fd, magicBuf, 0, 6, 0);
    fs.closeSync(fd);

    expect(magicBuf.toString("utf-8")).toBe("ADAUMC");
    expect(HEADER_OFFSET).toBe(16384);
  });

  it("should stream video data, calculate progress, and finalize valid .adaumc bundle", async () => {
    const rawVideoPath = path.join(testTempDir, "sample_vid.mp4");
    const thumbPath = path.join(testTempDir, "sample_thumb.jpg");
    const bundlePath = path.join(testTempDir, "packed_sample.adaumc");

    // Write 50KB dummy video and dummy thumbnail
    const videoData = Buffer.alloc(50 * 1024, 0x55);
    const thumbData = Buffer.from("JPG_SAMPLE_IMAGE_DATA_12345");
    fs.writeFileSync(rawVideoPath, videoData);
    fs.writeFileSync(thumbPath, thumbData);

    const packer = new ConcurrentPacker(bundlePath);

    const progressUpdates: number[] = [];
    packer.startPackingVideo(rawVideoPath, (percent) => {
      progressUpdates.push(percent);
    });

    const logs = ["Init log", "Stream log"];
    const assets = [
      { key: "thumbnail", filePath: thumbPath, mimeType: "image/jpeg" },
    ];

    await packer.finalizeBundle(
      "vid_stream_test_001",
      "Streaming Test Video",
      45.5,
      "1920x1080",
      ["Test", "Action"],
      logs,
      assets,
    );

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(90);

    // Verify bundle readability via BundleManager
    const { metadata } = BundleManager.readMetadata(bundlePath);
    expect(metadata.id).toBe("vid_stream_test_001");
    expect(metadata.title).toBe("Streaming Test Video");
    expect(metadata.duration).toBe(45.5);
    expect(metadata.resolution).toBe("1920x1080");
    expect(metadata.assets.video).toBeDefined();
    expect(metadata.assets.video.length).toBe(videoData.length);
    expect(metadata.assets.thumbnail).toBeDefined();
    expect(metadata.assets.thumbnail.length).toBe(thumbData.length);

    // Verify asset slice reading & demasking
    const thumbSlice = BundleManager.readAssetSlice(bundlePath, "thumbnail");
    expect(thumbSlice.buffer.toString("utf-8")).toBe("JPG_SAMPLE_IMAGE_DATA_12345");
  });

  it("should prune header logs when logs exceed 16KB header capacity without failing", async () => {
    const rawVideoPath = path.join(testTempDir, "small_vid.mp4");
    const bundlePath = path.join(testTempDir, "large_logs.adaumc");

    fs.writeFileSync(rawVideoPath, Buffer.from("tiny video"));

    const packer = new ConcurrentPacker(bundlePath);
    packer.startPackingVideo(rawVideoPath);

    // Generate 500 log lines to exceed 16KB header limit
    const hugeLogs: string[] = [];
    for (let i = 0; i < 500; i++) {
      hugeLogs.push(JSON.stringify({ step: i, msg: `This is a very long log line number ${i} with extra metadata and padding data` }));
    }

    await packer.finalizeBundle(
      "vid_huge_logs",
      "Huge Logs Test",
      10,
      "1280x720",
      [],
      hugeLogs,
      [],
    );

    // Should successfully read metadata back
    const { metadata } = BundleManager.readMetadata(bundlePath);
    expect(metadata.id).toBe("vid_huge_logs");
    expect(metadata.logs.length).toBeLessThan(hugeLogs.length);
  });

  it("should handle abort() cleanly during active video stream", () => {
    const rawVideoPath = path.join(testTempDir, "abort_vid.mp4");
    const bundlePath = path.join(testTempDir, "abort_sample.adaumc");

    fs.writeFileSync(rawVideoPath, Buffer.alloc(1024 * 1024, 0x11)); // 1MB

    const packer = new ConcurrentPacker(bundlePath);
    packer.startPackingVideo(rawVideoPath);

    expect(() => packer.abort()).not.toThrow();
  });
});
