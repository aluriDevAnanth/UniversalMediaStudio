import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { BundleManager } from "../src/main/bundle_manager";
import { Database, VideoRecord } from "../src/main/db";
import { calculateRelevanceScore, sortVideosByRelevance } from "../src/renderer/src/utils/relevanceScoring";
import { parseTag, getTagColor } from "../src/renderer/src/utils/tagColors";

describe("Performance & Benchmark SLA Assertions", () => {
  const tempDir = path.join(os.tmpdir(), `ums_sla_bench_${Date.now()}`);

  it("SLA: Stream Cipher Throughput should exceed 200 MB/s", () => {
    const bufSize = 4 * 1024 * 1024; // 4MB
    const buffer = Buffer.alloc(bufSize, 0x5a);
    const iterations = 50;

    // Warmup
    BundleManager.applyStreamCipherMask(buffer, 0);

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      BundleManager.applyStreamCipherMask(buffer, i * 1024);
    }
    const elapsedSeconds = (performance.now() - start) / 1000;
    const totalMB = (bufSize * iterations) / (1024 * 1024);
    const throughputMBs = totalMB / elapsedSeconds;

    // Fast 64-bit unrolled XOR typically reaches >1.5 GB/s
    expect(throughputMBs).toBeGreaterThan(200);
  });

  it("SLA: LRU In-Memory Cache Latency should be sub-millisecond (< 0.1ms avg)", async () => {
    fs.mkdirSync(tempDir, { recursive: true });
    const videoFile = path.join(tempDir, "sample_vid.mp4");
    const thumbFile = path.join(tempDir, "sample_thumb.jpg");
    const bundlePath = path.join(tempDir, "sla_test.adaumc");

    fs.writeFileSync(videoFile, Buffer.alloc(512 * 1024, 0x01));
    fs.writeFileSync(thumbFile, Buffer.alloc(32 * 1024, 0x02));

    await BundleManager.packBundle({
      id: "sla_vid",
      title: "SLA Test Video",
      duration: 60,
      resolution: "1080p",
      tags: ["Genre:Action"],
      assets: [
        { key: "video", filePath: videoFile, mimeType: "video/mp4" },
        { key: "thumbnail", filePath: thumbFile, mimeType: "image/jpeg" },
      ],
      outputPath: bundlePath,
    });

    // Prime the LRU cache
    BundleManager.readAssetSlice(bundlePath, "thumbnail");

    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const slice = BundleManager.readAssetSlice(bundlePath, "thumbnail");
      expect(slice.buffer.length).toBe(32 * 1024);
    }
    const avgLatencyMs = (performance.now() - start) / iterations;

    // Cached RAM slice must return under 0.1ms per fetch
    expect(avgLatencyMs).toBeLessThan(0.1);

    // Cleanup
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("SLA: Recommendation Scoring of 2,000 videos should complete in < 25ms", () => {
    const catalog: VideoRecord[] = [];
    const genres = ["Sci-Fi", "Action", "Thriller", "Drama", "Comedy"];
    for (let i = 0; i < 2000; i++) {
      catalog.push({
        id: `sla_rec_${i}`,
        title: `Cyberpunk Matrix Odyssey ${i}`,
        duration: 120,
        resolution: "1080p",
        tags: [`Genre:${genres[i % genres.length]}`, `Series:Matrix`, `Actor:Hero_${i % 10}`],
        bundlePath: `/bundles/sla_${i}.adaumc`,
        createdAt: new Date().toISOString(),
        playCount: i % 10,
      });
    }

    const start = performance.now();
    const ranked = sortVideosByRelevance(catalog, {
      searchQuery: "Matrix Cyberpunk",
      selectedTags: ["Genre:Sci-Fi"],
      playlists: [
        {
          id: "favourite",
          name: "Favorites",
          isDefault: true,
          videoIds: ["sla_rec_0", "sla_rec_5"],
          createdAt: new Date().toISOString(),
        },
      ],
    });
    const elapsedMs = performance.now() - start;

    expect(ranked.length).toBe(2000);
    expect(elapsedMs).toBeLessThan(25);
  });

  it("SLA: Tag Color Hashing should process > 300,000 tags/second", () => {
    const tags = [
      "Genre:Action",
      "Series:Matrix",
      "Actor:Keanu",
      "Director:Wachowski",
      "Mood:Epic",
      "Topic:AI",
    ];

    const iterations = 50000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const tag = tags[i % tags.length];
      const parsed = parseTag(tag);
      getTagColor(parsed.full);
    }
    const elapsedSeconds = (performance.now() - start) / 1000;
    const opsPerSec = iterations / elapsedSeconds;

    expect(opsPerSec).toBeGreaterThan(300000);
  });

  it("SLA: Protocol Range Header Parsing should process > 200,000 requests/second", () => {
    const rangeHeaders = [
      "bytes=0-1048575",
      "bytes=1048576-2097151",
      "bytes=4194304-",
      "bytes=0-",
    ];

    const iterations = 50000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const header = rangeHeaders[i % rangeHeaders.length];
      const matches = header.match(/bytes=(\d*)-(\d*)/);
      if (matches) {
        const startByte = matches[1] ? parseInt(matches[1], 10) : 0;
        const endByte = matches[2] ? parseInt(matches[2], 10) : undefined;
        const maxChunk = 4 * 1024 * 1024;
        const finalEnd = endByte !== undefined ? endByte : startByte + maxChunk - 1;
        const _len = finalEnd - startByte + 1;
      }
    }
    const elapsedSeconds = (performance.now() - start) / 1000;
    const opsPerSec = iterations / elapsedSeconds;

    expect(opsPerSec).toBeGreaterThan(200000);
  });
});
