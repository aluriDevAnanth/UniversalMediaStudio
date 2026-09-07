import fs from "fs";
import path from "path";
import os from "os";

// Initialize isolated temporary testing environment inside data/temp/ before loading app modules
const dataTempDir = path.join(process.cwd(), "data", "temp");
if (!fs.existsSync(dataTempDir)) {
  try {
    fs.mkdirSync(dataTempDir, { recursive: true });
  } catch {}
}
const isolatedTempEnv = path.join(dataTempDir, `benchmark_${Date.now()}`);
fs.mkdirSync(isolatedTempEnv, { recursive: true });
process.env.UMS_USER_DATA_DIR = isolatedTempEnv;

import { importVideoFile } from "../src/main/random_video";
import { db } from "../src/main/db";

interface MediaBenchmarkItem {
  fileName: string;
  fileSizeBytes: number;
  durationSec: number;
  resolution: string;
  totalTimeSec: number;
  throughputMBs: number;
  bundleSizeBytes: number;
  createdAt: string;
  stepTimings: {
    step1Sec: number;
    step2Sec: number;
    step3Sec: number;
    step4Sec: number;
  };
}

async function runMediaBenchmark() {
  const inputArg = process.argv[2]?.trim();
  const targetDir = inputArg
    ? path.resolve(inputArg.replace(/^["']|["']$/g, ""))
    : path.join(os.homedir(), "Downloads");

  console.log("\n================================================================================");
  console.log("            UniversalMediaStudio - Batch Media Import Benchmark");
  console.log("================================================================================\n");
  console.log(`Testing Mode  : ISOLATED TEMPORARY ENVIRONMENT`);
  console.log(`Temp Directory: ${isolatedTempEnv}\n`);

  if (!inputArg) {
    console.log(`[Info] No folder specified. Defaulting to: ${targetDir}`);
    console.log(`[Usage] Pass custom folder path: bun run benchmark:folder "<path-to-folder>"\n`);
  }

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Specified directory does not exist:\n  ${targetDir}\n`);
    console.log(`Please provide a valid directory path containing video files.`);
    console.log(`Example: bun run benchmark:folder "C:\\Media\\Videos"`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(targetDir)
    .filter((f) => /\.(mp4|mkv|avi|webm|mov|m4v|adaumc)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) {
    console.warn(`No supported media files (.mp4, .mkv, .avi, .webm, .mov, .m4v, .adaumc) found in:\n  ${targetDir}`);
    process.exit(0);
  }

  console.log(`Target Folder : ${targetDir}`);
  console.log(`Media Files   : ${files.length} videos detected`);
  const totalRawBytes = files.reduce((sum, f) => sum + fs.statSync(path.join(targetDir, f)).size, 0);
  console.log(`Dataset Size  : ${(totalRawBytes / (1024 * 1024 * 1024)).toFixed(2)} GB (${(totalRawBytes / (1024 * 1024)).toFixed(1)} MB)\n`);

  const results: MediaBenchmarkItem[] = [];
  const benchmarkStart = Date.now();
  const baseSelectionTime = Date.now();

  try {
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const filePath = path.join(targetDir, fileName);
      const stat = fs.statSync(filePath);
      const creationTimestamp = new Date(baseSelectionTime + i * 10).toISOString();
      const taskId = `bench_item_${Date.now()}_${i + 1}`;

      console.log(`▶ [${i + 1}/${files.length}] Processing: ${fileName} (${(stat.size / (1024 * 1024)).toFixed(1)} MB)`);

      const itemStart = Date.now();
      let s1Time = 0;
      let s2Time = 0;
      let s3Time = 0;
      let s4Time = 0;
      let lastStepTime = itemStart;

      const record = await importVideoFile(
        filePath,
        (progress) => {
          const now = Date.now();
          if (progress.percent === 100) {
            const stepElapsed = (now - lastStepTime) / 1000;
            if (progress.step === 1) s1Time = stepElapsed;
            if (progress.step === 2) s2Time = stepElapsed;
            if (progress.step === 3) s3Time = stepElapsed;
            if (progress.step === 4) s4Time = stepElapsed;
            lastStepTime = now;
          }
          if (progress.percent === 0 || progress.percent === 50 || progress.percent === 100) {
            const etaStr = progress.etaSeconds !== null ? ` | ETA: ${progress.etaSeconds}s` : "";
            console.log(`   └─ Step ${progress.step}/4 (${progress.percent}%): ${progress.log}${etaStr}`);
          }
        },
        taskId,
        creationTimestamp,
      );

      const itemDuration = (Date.now() - itemStart) / 1000;
      const throughput = (stat.size / (1024 * 1024)) / Math.max(0.1, itemDuration);
      const bundleSize = record?.bundlePath && fs.existsSync(record.bundlePath) ? fs.statSync(record.bundlePath).size : 0;

      console.log(`   ✔ FINISHED in ${itemDuration.toFixed(2)}s | Speed: ${throughput.toFixed(2)} MB/s | Bundle: ${(bundleSize / (1024 * 1024)).toFixed(1)} MB\n`);

      if (record) {
        results.push({
          fileName,
          fileSizeBytes: stat.size,
          durationSec: record.duration,
          resolution: record.resolution,
          totalTimeSec: itemDuration,
          throughputMBs: throughput,
          bundleSizeBytes: bundleSize,
          createdAt: record.createdAt,
          stepTimings: {
            step1Sec: s1Time,
            step2Sec: s2Time,
            step3Sec: s3Time,
            step4Sec: s4Time,
          },
        });
      }
    }

    const totalBenchmarkTime = (Date.now() - benchmarkStart) / 1000;
    const totalProcessedMB = results.reduce((acc, r) => acc + r.fileSizeBytes, 0) / (1024 * 1024);
    const avgThroughput = totalProcessedMB / Math.max(0.1, totalBenchmarkTime);
    const avgTimePerItem = totalBenchmarkTime / Math.max(1, results.length);

    console.log("================================================================================");
    console.log("                        BENCHMARK SUMMARY & METRICS");
    console.log("================================================================================");
    console.log(`Videos Processed      : ${results.length} / ${files.length}`);
    console.log(`Total Dataset Size    : ${totalProcessedMB.toFixed(1)} MB (${(totalProcessedMB / 1024).toFixed(2)} GB)`);
    console.log(`Total Wall Clock Time : ${totalBenchmarkTime.toFixed(2)} seconds (${(totalBenchmarkTime / 60).toFixed(2)} minutes)`);
    console.log(`Average Time / Video  : ${avgTimePerItem.toFixed(2)} seconds`);
    console.log(`Effective Throughput  : ${avgThroughput.toFixed(2)} MB/s`);
    console.log("--------------------------------------------------------------------------------\n");

    // Verify "Oldest Added" Sorting Order in Isolated DB
    console.log("Verifying 'Oldest Added' Selection Order Preservation...");
    const allVideos = db.getAllVideos();
    const sortedOldest = [...allVideos].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    let sortPreserved = true;
    for (let i = 0; i < Math.min(results.length, sortedOldest.length); i++) {
      const expectedName = results[i].fileName.replace(/\.[^/.]+$/, "");
      if (sortedOldest[i].title !== expectedName && !sortedOldest[i].title.includes(expectedName)) {
        sortPreserved = false;
        break;
      }
    }

    if (sortPreserved) {
      console.log("✔ PASSED: 'Oldest Added' sorting strictly preserves file selection order!\n");
    } else {
      console.log("Notice: Review sorting index alignment.\n");
    }
  } finally {
    // Automatically clean up isolated temporary environment after benchmark
    console.log(`[Cleanup] Removing isolated test environment directory: ${isolatedTempEnv}`);
    try {
      fs.rmSync(isolatedTempEnv, { recursive: true, force: true });
      console.log("[Cleanup] Isolated environment cleaned up successfully.\n");
    } catch (e) {
      console.warn("[Cleanup] Warning cleaning temp directory:", e);
    }
  }
}

runMediaBenchmark().catch((err) => {
  console.error("Benchmark Error:", err);
  process.exit(1);
});
