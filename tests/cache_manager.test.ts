import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { CacheManager } from "../src/main/cache_manager";
import { BundleManager } from "../src/main/bundle_manager";

describe("Segment Cache & LRU Eviction Engine (src/main/cache_manager.ts)", () => {
  let cache: CacheManager;
  let testTempDir: string;

  beforeEach(() => {
    cache = CacheManager.getInstance();
    cache.clear();
    testTempDir = path.join(os.tmpdir(), `ums_cache_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testTempDir, { recursive: true });
  });

  afterEach(() => {
    cache.clear();
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it("should return the singleton instance consistently", () => {
    const inst1 = CacheManager.getInstance();
    const inst2 = CacheManager.getInstance();
    expect(inst1).toBe(inst2);
  });

  it("should store and retrieve cached segments with correct key and data", () => {
    const bundlePath = "/path/to/test.adaumc";
    const assetKey = "video";
    const start = 0;
    const end = 1023;
    const data = Buffer.from("Test segment content 12345");

    expect(cache.get(bundlePath, assetKey, start, end)).toBeNull();

    cache.set(bundlePath, assetKey, start, end, data);

    const retrieved = cache.get(bundlePath, assetKey, start, end);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.equals(data)).toBe(true);
  });

  it("should return null for non-existent cache keys and clear all entries with clear()", () => {
    cache.set("/bundle1.adaumc", "video", 0, 500, Buffer.from("data1"));
    cache.set("/bundle2.adaumc", "thumbnail", 0, 200, Buffer.from("data2"));

    expect(cache.get("/bundle1.adaumc", "video", 0, 500)).not.toBeNull();
    expect(cache.get("/bundle2.adaumc", "thumbnail", 0, 200)).not.toBeNull();

    cache.clear();

    expect(cache.get("/bundle1.adaumc", "video", 0, 500)).toBeNull();
    expect(cache.get("/bundle2.adaumc", "thumbnail", 0, 200)).toBeNull();
  });

  it("should update lastAccess timestamp on get() calls", async () => {
    cache.set("/bundle.adaumc", "video", 0, 100, Buffer.from("segment0"));
    cache.set("/bundle.adaumc", "video", 101, 200, Buffer.from("segment1"));

    await new Promise((r) => setTimeout(r, 10));

    // Access first entry to make it more recently used than segment1
    const val = cache.get("/bundle.adaumc", "video", 0, 100);
    expect(val).not.toBeNull();
  });

  it("should prefetch video segments asynchronously into cache from bundle files", async () => {
    // Create a real small bundle file to test prefetchSegment
    const bundlePath = path.join(testTempDir, "prefetch_sample.adaumc");
    const rawVideo = path.join(testTempDir, "prefetch_vid.mp4");
    const rawThumb = path.join(testTempDir, "prefetch_thumb.jpg");

    const videoContent = Buffer.alloc(100 * 1024, 0x42); // 100KB of video bytes
    fs.writeFileSync(rawVideo, videoContent);
    fs.writeFileSync(rawThumb, Buffer.from("fake thumbnail"));

    await BundleManager.packBundle({
      id: "vid_prefetch_test",
      title: "Prefetch Test Video",
      duration: 30,
      resolution: "1280x720",
      tags: ["Test"],
      logs: [],
      assets: [
        { key: "video", filePath: rawVideo, mimeType: "video/mp4" },
        { key: "thumbnail", filePath: rawThumb, mimeType: "image/jpeg" },
      ],
      outputPath: bundlePath,
    });

    const { metadata, payloadStartOffset } = BundleManager.readMetadata(bundlePath);
    const videoAsset = metadata.assets.video;

    // Cache should initially be empty for this segment
    expect(cache.get(bundlePath, "video", 1000, 2000)).toBeNull();

    // Trigger async prefetch
    await cache.prefetchSegment(
      bundlePath,
      "video",
      1000,
      2000,
      payloadStartOffset,
      videoAsset.offset,
    );

    const cachedData = cache.get(bundlePath, "video", 1000, 2000);
    expect(cachedData).not.toBeNull();
    expect(cachedData!.length).toBe(1001); // (2000 - 1000 + 1)
    // Verify demasked data matches original video bytes
    expect(cachedData![0]).toBe(0x42);
    expect(cachedData![500]).toBe(0x42);
  });

  it("should ignore invalid or out-of-range prefetch requests gracefully", async () => {
    const invalidPath = path.join(testTempDir, "non_existent.adaumc");

    // Should not throw even if file doesn't exist
    await cache.prefetchSegment(invalidPath, "video", 0, 100, 0, 0);
    expect(cache.get(invalidPath, "video", 0, 100)).toBeNull();

    // Should reject length <= 0
    await cache.prefetchSegment(invalidPath, "video", 500, 400, 0, 0);
  });
});
