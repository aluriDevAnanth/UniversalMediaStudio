import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { DeferredAssetQueue, DeferredTask } from "../src/main/deferred_asset_queue";
import { FFmpegProcessor } from "../src/main/ffmpeg_processor";

describe("Deferred Asset Enrichment Queue (src/main/deferred_asset_queue.ts)", () => {
  let testTempDir: string;
  let origGif: any;
  let origSprite: any;

  beforeEach(() => {
    testTempDir = path.join(os.tmpdir(), `ums_deferred_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testTempDir, { recursive: true });
    origGif = FFmpegProcessor.generateGifMedianCut;
    origSprite = FFmpegProcessor.generateSpriteSheetAndVTT;
  });

  afterEach(() => {
    FFmpegProcessor.generateGifMedianCut = origGif;
    FFmpegProcessor.generateSpriteSheetAndVTT = origSprite;
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it("should initialize with default concurrency and report pendingCount", () => {
    const queue = new DeferredAssetQueue(2);
    expect(queue.pendingCount).toBe(0);
  });

  it("should reject duplicate enrichment tasks for the same video ID", () => {
    const queue = new DeferredAssetQueue(1);
    const task1: DeferredTask = {
      videoId: "vid_dup_001",
      sourcePath: path.join(testTempDir, "source.mp4"),
      bundlePath: path.join(testTempDir, "bundle.adaumc"),
      duration: 60,
    };

    const task2: DeferredTask = {
      videoId: "vid_dup_001",
      sourcePath: path.join(testTempDir, "source2.mp4"),
      bundlePath: path.join(testTempDir, "bundle2.adaumc"),
      duration: 120,
    };

    queue.enqueue(task1);
    queue.enqueue(task2);

    expect(queue.pendingCount).toBeLessThanOrEqual(1);
  });

  it("should gracefully handle missing source and bundle files without throwing", async () => {
    const queue = new DeferredAssetQueue(1);
    let enrichedCalled = false;

    const task: DeferredTask = {
      videoId: "vid_missing_files",
      sourcePath: path.join(testTempDir, "non_existent_source.mp4"),
      bundlePath: path.join(testTempDir, "non_existent_bundle.adaumc"),
      duration: 30,
      onEnriched: () => {
        enrichedCalled = true;
      },
    };

    queue.enqueue(task);

    await new Promise((r) => setTimeout(r, 50));
    expect(queue.pendingCount).toBe(0);
    expect(enrichedCalled).toBe(false);
  });

  it("should invoke onEnriched callback when processing completes", async () => {
    // Mock FFmpeg processor methods so test runs fast and deterministically
    FFmpegProcessor.generateGifMedianCut = async () => [];
    FFmpegProcessor.generateSpriteSheetAndVTT = async () => ({ logs: [] });

    const queue = new DeferredAssetQueue(1);
    const dummySource = path.join(testTempDir, "source.mp4");
    const dummyBundle = path.join(testTempDir, "bundle.adaumc");

    fs.writeFileSync(dummySource, "dummy video data");
    fs.writeFileSync(dummyBundle, "dummy bundle data");

    let enrichedVideoId = "";
    const task: DeferredTask = {
      videoId: "vid_enrich_success",
      sourcePath: dummySource,
      bundlePath: dummyBundle,
      duration: 15,
      onEnriched: (id) => {
        enrichedVideoId = id;
      },
    };

    queue.enqueue(task);

    // Wait for the asynchronous task execution
    for (let i = 0; i < 20 && !enrichedVideoId; i++) {
      await new Promise((r) => setTimeout(r, 20));
    }

    expect(enrichedVideoId).toBe("vid_enrich_success");
  });
});
