/**
 * UniversalMediaStudio Comprehensive Performance Benchmark Suite
 * 
 * Benchmarks:
 * 1. ADAUMC 64-bit Symmetric XOR Stream Cipher (Throughput & Offset seeking)
 * 2. ADAUMC Bundle Header & Asset Slicing (LRU Cache vs Cold Disk Read)
 * 3. Database Scaling & Search Throughput (Bulk Insert, Multi-Tag Queries, Analytics)
 * 4. Recommendation & Relevance Ranking (Dice-Sørensen, Weighted Jaccard, Catalog Sort)
 * 5. Tag Color Hashing & Parsing (Category Extraction & HSL Color Lookup)
 * 6. Protocol Range Boundary & Slicing Calculations
 */

import fs from "fs";
import path from "path";
import os from "os";
import { BundleManager } from "../src/main/bundle_manager";
import { Database, VideoRecord } from "../src/main/db";
import { calculateRelevanceScore, sortVideosByRelevance } from "../src/renderer/src/utils/relevanceScoring";
import { parseTag, getTagColor } from "../src/renderer/src/utils/tagColors";

// --- Benchmark Runner Utilities ---

interface BenchmarkResult {
  name: string;
  category: string;
  iterations: number;
  totalTimeMs: number;
  opsPerSec: number;
  throughputMBs?: number;
  minMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  memoryDeltaMB: number;
}

function runBenchmark(
  category: string,
  name: string,
  fn: () => void,
  options: { iterations?: number; warmup?: number; bytesPerOp?: number } = {}
): BenchmarkResult {
  const iterations = options.iterations || 100;
  const warmup = options.warmup || 10;
  const bytesPerOp = options.bytesPerOp || 0;

  // Warmup phase
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  // Force garbage collection if available
  if (typeof (globalThis as any).gc === "function") {
    (globalThis as any).gc();
  }

  const initialMemory = process.memoryUsage().heapUsed;
  const latencies: number[] = new Array(iterations);

  const startTotal = performance.now();
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    latencies[i] = performance.now() - start;
  }
  const totalTimeMs = performance.now() - startTotal;
  const finalMemory = process.memoryUsage().heapUsed;

  latencies.sort((a, b) => a - b);

  const minMs = latencies[0];
  const maxMs = latencies[latencies.length - 1];
  const avgMs = totalTimeMs / iterations;
  const p50Ms = latencies[Math.floor(iterations * 0.5)];
  const p95Ms = latencies[Math.floor(iterations * 0.95)];
  const p99Ms = latencies[Math.floor(iterations * 0.99)];
  const opsPerSec = (iterations / totalTimeMs) * 1000;
  const totalBytes = bytesPerOp * iterations;
  const throughputMBs = totalBytes > 0 ? (totalBytes / (1024 * 1024)) / (totalTimeMs / 1000) : undefined;
  const memoryDeltaMB = (finalMemory - initialMemory) / (1024 * 1024);

  return {
    name,
    category,
    iterations,
    totalTimeMs,
    opsPerSec,
    throughputMBs,
    minMs,
    avgMs,
    p50Ms,
    p95Ms,
    p99Ms,
    maxMs,
    memoryDeltaMB,
  };
}

// Format display table
function printResultsTable(results: BenchmarkResult[]) {
  const divider = "═".repeat(110);
  const thinDivider = "─".repeat(110);

  console.log("\n" + divider);
  console.log("  UNIVERSAL MEDIA STUDIO - SUB-SYSTEM PERFORMANCE BENCHMARKS");
  console.log(divider);
  console.log(
    ` ${"Benchmark".padEnd(38)} | ${"Ops/sec".padStart(12)} | ${"Throughput".padStart(12)} | ${"Avg (ms)".padStart(10)} | ${"p95 (ms)".padStart(10)} | ${"p99 (ms)".padStart(10)}`
  );
  console.log(thinDivider);

  let currentCat = "";
  for (const res of results) {
    if (res.category !== currentCat) {
      currentCat = res.category;
      console.log(`\x1b[36m▶ [${currentCat.toUpperCase()}]\x1b[0m`);
    }

    const opsFormatted = res.opsPerSec > 10000 
      ? `${(res.opsPerSec / 1000).toFixed(1)}k ops/s`
      : `${res.opsPerSec.toFixed(1)} ops/s`;

    const throughputFormatted = res.throughputMBs 
      ? res.throughputMBs > 1024 
        ? `${(res.throughputMBs / 1024).toFixed(2)} GB/s` 
        : `${res.throughputMBs.toFixed(1)} MB/s`
      : "—";

    console.log(
      `  ${res.name.padEnd(36)} | ${opsFormatted.padStart(12)} | ${throughputFormatted.padStart(12)} | ${res.avgMs.toFixed(3).padStart(10)} | ${res.p95Ms.toFixed(3).padStart(10)} | ${res.p99Ms.toFixed(3).padStart(10)}`
    );
  }
  console.log(divider + "\n");
}

async function main() {
  console.log("\x1b[33m⚡ Initializing UniversalMediaStudio Benchmarking Suite...\x1b[0m");
  const results: BenchmarkResult[] = [];
  const tempDir = path.join(os.tmpdir(), `ums_bench_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // ----------------------------------------------------
    // 1. ADAUMC Stream Cipher & Bitwise Masking
    // ----------------------------------------------------
    const smallBuf = Buffer.alloc(64 * 1024, 0xaa);
    results.push(
      runBenchmark(
        "ADAUMC Cipher Engine",
        "Stream Cipher (64 KB Chunk)",
        () => {
          BundleManager.applyStreamCipherMask(smallBuf, 0);
        },
        { iterations: 1000, warmup: 50, bytesPerOp: 64 * 1024 }
      )
    );

    const medBuf = Buffer.alloc(4 * 1024 * 1024, 0xbb);
    results.push(
      runBenchmark(
        "ADAUMC Cipher Engine",
        "Stream Cipher (4 MB Video Chunk)",
        () => {
          BundleManager.applyStreamCipherMask(medBuf, 1024 * 512);
        },
        { iterations: 100, warmup: 10, bytesPerOp: 4 * 1024 * 1024 }
      )
    );

    const largeBuf = Buffer.alloc(32 * 1024 * 1024, 0xcc);
    results.push(
      runBenchmark(
        "ADAUMC Cipher Engine",
        "Stream Cipher (32 MB Large Stream)",
        () => {
          BundleManager.applyStreamCipherMask(largeBuf, 99999);
        },
        { iterations: 15, warmup: 2, bytesPerOp: 32 * 1024 * 1024 }
      )
    );

    // ----------------------------------------------------
    // 2. ADAUMC Bundle Packaging, Slicing & LRU Caching
    // ----------------------------------------------------
    const videoFile = path.join(tempDir, "video.mp4");
    const thumbFile = path.join(tempDir, "thumb.jpg");
    const bundleFile = path.join(tempDir, "test.adaumc");

    fs.writeFileSync(videoFile, Buffer.alloc(2 * 1024 * 1024, 0x11)); // 2MB
    fs.writeFileSync(thumbFile, Buffer.alloc(64 * 1024, 0x22)); // 64KB

    await BundleManager.packBundle({
      id: "bench_vid",
      title: "Benchmark Bundle Asset",
      duration: 120,
      resolution: "1080p",
      tags: ["Genre:Action", "Series:Benchmark"],
      assets: [
        { key: "video", filePath: videoFile, mimeType: "video/mp4" },
        { key: "thumbnail", filePath: thumbFile, mimeType: "image/jpeg" },
      ],
      outputPath: bundleFile,
    });

    results.push(
      runBenchmark(
        "ADAUMC Storage & Cache",
        "Read Header Metadata (Warm Cache)",
        () => {
          BundleManager.readMetadata(bundleFile);
        },
        { iterations: 5000, warmup: 50 }
      )
    );

    results.push(
      runBenchmark(
        "ADAUMC Storage & Cache",
        "LRU Cache Asset Slice (Thumbnail)",
        () => {
          BundleManager.readAssetSlice(bundleFile, "thumbnail");
        },
        { iterations: 2000, warmup: 20, bytesPerOp: 64 * 1024 }
      )
    );

    results.push(
      runBenchmark(
        "ADAUMC Storage & Cache",
        "4MB Range Slice Seeking",
        () => {
          BundleManager.readAssetSlice(bundleFile, "video", 0, 512 * 1024);
        },
        { iterations: 200, warmup: 10, bytesPerOp: 512 * 1024 }
      )
    );

    // ----------------------------------------------------
    // 3. Database Scaling & Search Throughput
    // ----------------------------------------------------
    const benchDbPath = path.join(tempDir, "bench_db.json");
    const benchDb = new Database(benchDbPath);

    // Generate 1,000 synthetic videos
    const syntheticVideos: VideoRecord[] = [];
    const genres = ["Sci-Fi", "Action", "Drama", "Thriller", "Documentary", "Comedy"];
    const franchises = ["Matrix", "Marvel", "Avatar", "StarWars", "Cyberpunk"];
    for (let i = 0; i < 1000; i++) {
      syntheticVideos.push({
        id: `bench_vid_${i}`,
        title: `Synthetic Movie ${i} - ${franchises[i % franchises.length]} Odyssey`,
        duration: 100 + (i % 200),
        resolution: i % 2 === 0 ? "4K" : "1080p",
        tags: [
          `Genre:${genres[i % genres.length]}`,
          `Series:${franchises[i % franchises.length]}`,
          `Actor:Star_${i % 20}`,
        ],
        bundlePath: `/path/to/vid_${i}.adaumc`,
        createdAt: new Date(Date.now() - (i * 3600000)).toISOString(),
        playCount: i % 15,
        lastWatchedAt: i % 3 === 0 ? new Date().toISOString() : undefined,
      });
    }

    results.push(
      runBenchmark(
        "Database Engine",
        "Bulk Save 50 Video Records",
        () => {
          for (let i = 0; i < 50; i++) {
            benchDb.saveVideo(syntheticVideos[i]);
          }
        },
        { iterations: 10, warmup: 2 }
      )
    );

    // Pre-populate db with 1,000 items
    for (const v of syntheticVideos) {
      benchDb.saveVideo(v);
    }

    results.push(
      runBenchmark(
        "Database Engine",
        "Fetch All 1,000 Records",
        () => {
          benchDb.getAllVideos();
        },
        { iterations: 2000, warmup: 50 }
      )
    );

    results.push(
      runBenchmark(
        "Database Engine",
        "Compute Analytics & Aggregates",
        () => {
          benchDb.getAnalytics();
        },
        { iterations: 500, warmup: 20 }
      )
    );

    // ----------------------------------------------------
    // 4. Recommendation & Relevance Engine
    // ----------------------------------------------------
    const targetVideo = syntheticVideos[0];
    const dummyPlaylists = [
      {
        id: "favourite",
        name: "Favorites",
        isDefault: true,
        videoIds: syntheticVideos.slice(0, 50).map((v) => v.id),
        createdAt: new Date().toISOString(),
      },
    ];

    results.push(
      runBenchmark(
        "Relevance & Recommendation",
        "Score Single Video (Search+Tags+Prefs)",
        () => {
          calculateRelevanceScore(targetVideo, {
            searchQuery: "Matrix Odyssey",
            selectedTags: ["Genre:Sci-Fi", "Series:Matrix"],
            playlists: dummyPlaylists,
            allVideos: syntheticVideos.slice(0, 100),
          });
        },
        { iterations: 1000, warmup: 50 }
      )
    );

    results.push(
      runBenchmark(
        "Relevance & Recommendation",
        "Rank & Sort Catalog (1,000 Videos)",
        () => {
          sortVideosByRelevance(syntheticVideos, {
            searchQuery: "Marvel Action",
            selectedTags: ["Genre:Action"],
            playlists: dummyPlaylists,
          });
        },
        { iterations: 100, warmup: 10 }
      )
    );

    // Scale to 5,000 videos
    const largeCatalog: VideoRecord[] = [];
    for (let i = 0; i < 5; i++) {
      largeCatalog.push(...syntheticVideos.map((v, idx) => ({ ...v, id: `${v.id}_${i}` })));
    }

    results.push(
      runBenchmark(
        "Relevance & Recommendation",
        "Rank & Sort Scale (5,000 Videos)",
        () => {
          sortVideosByRelevance(largeCatalog, {
            searchQuery: "Sci-Fi Cyberpunk",
            selectedTags: ["Genre:Sci-Fi", "Series:Cyberpunk"],
            playlists: dummyPlaylists,
          });
        },
        { iterations: 30, warmup: 5 }
      )
    );

    // ----------------------------------------------------
    // 5. Tag Categorization & HSL Hashing
    // ----------------------------------------------------
    const testTags = [
      "Genre:Action",
      "Series:Cyberpunk 2077",
      "Director:Christopher Nolan",
      "Actor:Keanu Reeves",
      "Mood:Excited",
      "Topic:Space Travel",
      "Resolution:4K",
      "Language:English",
    ];

    results.push(
      runBenchmark(
        "Tag Processing & UI",
        "Parse & Hash Tag Color (1,000 tags)",
        () => {
          for (let i = 0; i < 1000; i++) {
            const tag = testTags[i % testTags.length];
            const parsed = parseTag(tag);
            getTagColor(parsed.full);
          }
        },
        { iterations: 200, warmup: 20 }
      )
    );

    // ----------------------------------------------------
    // 6. Protocol Range Slicing & Boundary Calculations
    // ----------------------------------------------------
    const testRanges = [
      "bytes=0-1048575",
      "bytes=1048576-2097151",
      "bytes=5242880-",
      "bytes=0-",
    ];

    results.push(
      runBenchmark(
        "Streaming Protocol Engine",
        "Range Slicing Boundaries (10,000 reqs)",
        () => {
          for (let i = 0; i < 10000; i++) {
            const header = testRanges[i % testRanges.length];
            const matches = header.match(/bytes=(\d*)-(\d*)/);
            if (matches) {
              const start = matches[1] ? parseInt(matches[1], 10) : 0;
              const end = matches[2] ? parseInt(matches[2], 10) : undefined;
              const maxChunk = 4 * 1024 * 1024;
              const finalEnd = end !== undefined ? end : start + maxChunk - 1;
              const _len = finalEnd - start + 1;
            }
          }
        },
        { iterations: 50, warmup: 5 }
      )
    );

    // Print Formatted Output Table
    printResultsTable(results);
    console.log("\x1b[32m✔ All benchmarks completed successfully!\x1b[0m\n");
  } finally {
    // Cleanup temporary benchmark files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
