import path from "path";
import fs from "fs";
import { app } from "electron";
import { FFmpegProcessor, SpriteProgressUpdate, makeLog } from "./ffmpeg_worker";
import { BundleManager } from "./bundle_manager";
import { db } from "./db";
import { ConcurrentPacker } from "./concurrent_packer";

export interface ProgressUpdate {
  taskId: string;
  fileName: string;
  step: number;
  totalSteps: number;
  percent: number;
  workDone?: number;
  totalWork?: number;
  log: string;
  etaSeconds: number | null;
}

export const activeImportTasks = new Map<string, { videoId: string; isCancelled: boolean }>();

export function cancelActiveImport(taskId?: string): void {
  if (taskId) {
    const task = activeImportTasks.get(taskId);
    if (task) {
      task.isCancelled = true;
      FFmpegProcessor.killActiveChildProcesses(taskId);
      console.log(`[Import] Cancelled active import task and killed processes for taskId: ${taskId}`);
    }
  } else {
    for (const [id, task] of activeImportTasks.entries()) {
      task.isCancelled = true;
      FFmpegProcessor.killActiveChildProcesses(id);
      console.log(`[Import] Cancelled active import task and killed processes for taskId: ${id}`);
    }
  }
}

export const activeImportFilePaths = new Set<string>();

export async function importVideoFile(
  selectedPath: string,
  onProgress?: (progress: ImportProgress) => void,
  taskId?: string,
): Promise<VideoRecord | null> {
  let packer: ConcurrentPacker | null = null;
  const ext = path.extname(selectedPath).toLowerCase().replace(".", "");
  const videoExtensions = ["mp4", "mkv", "avi", "webm", "mov", "m4v", "adaumc"];
  if (!videoExtensions.includes(ext)) {
    throw new Error(`Unsupported video format: .${ext}`);
  }

  const fileName = path.basename(selectedPath, path.extname(selectedPath));
  const videoId = taskId || `vid_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  let inputSizeBytes = 0;
  try {
    if (fs.existsSync(selectedPath)) {
      inputSizeBytes = fs.statSync(selectedPath).size;
    }
  } catch (e) {}

  const normPath = path.normalize(selectedPath).toLowerCase();
  const fileKey = `${fileName.toLowerCase()}_${inputSizeBytes}`;

  const broadcastProgress = (
    step: number,
    percent: number,
    log: string,
    etaSeconds: number | null = null,
    workDone?: number,
    totalWork?: number,
  ) => {
    if (onProgress) {
      onProgress({
        taskId: videoId,
        fileName,
        step,
        totalSteps: 4,
        percent,
        workDone,
        totalWork,
        log,
        etaSeconds,
      });
    }
  };

  // 1. Active Task Deduplication Check
  if (activeImportFilePaths.has(normPath) || activeImportFilePaths.has(fileKey)) {
    console.log(`[Import Pre-check] Video '${fileName}' is currently being imported in another active task. Skipping.`);
    broadcastProgress(4, 100, `Video '${fileName}' is already importing...`, 0);
    return null;
  }

  // 2. Database Fast Pre-check (BEFORE creating temp folders, running ffprobe, or starting packer)
  const existingRecord = db.getAllVideos().find((v) => {
    if (v.bundlePath && path.normalize(v.bundlePath).toLowerCase() === normPath) return true;
    if (v.title.toLowerCase() === fileName.toLowerCase()) {
      if (v.fileSize && inputSizeBytes > 0 && v.fileSize === inputSizeBytes) return true;
      if (!v.fileSize && inputSizeBytes > 0) return true;
    }
    return false;
  });

  if (existingRecord) {
    console.log(`[Import Pre-check] Video '${fileName}' already exists in library. Skipping duplicate import.`);
    broadcastProgress(4, 100, `Video '${fileName}' is already present in your library!`, 0);
    return existingRecord;
  }

  activeImportTasks.set(videoId, { videoId, isCancelled: false });
  activeImportFilePaths.add(normPath);
  activeImportFilePaths.add(fileKey);

  broadcastProgress(0, 0, "Initializing import...");

  let bundlePath = "";

  try {
    if (activeImportTasks.get(videoId)?.isCancelled) {
      activeImportTasks.delete(videoId);
      activeImportFilePaths.delete(normPath);
      activeImportFilePaths.delete(fileKey);
      return null;
    }

    const startTime = Date.now();
    const logs: string[] = [];

    logs.push(
      makeLog({
        event: "info",
        step: 0,
        stepName: "Init",
        msg: `Started video import for '${fileName}' (ID: ${videoId})`,
        details: {
          videoId,
          fileName,
          selectedPath,
          inputSizeBytes,
          osPlatform: process.platform,
          cpuCores: require("os").cpus().length || 4,
          nodeVersion: process.version,
        },
      }),
    );

    const checkCancelled = () => {
      if (activeImportTasks.get(videoId)?.isCancelled) {
        logs.push(
          makeLog({
            level: "warn",
            event: "warn",
            step: 0,
            stepName: "Init",
            msg: `Import process cancelled by user signal`,
          }),
        );
        throw new Error("Import cancelled");
      }
    };

    // Handle pre-built .adaumc files imported directly
    if (selectedPath.endsWith(".adaumc")) {
      broadcastProgress(1, 50, `Importing pre-built .adaumc container file...`);

      const bundlesDir = path.join(app.getPath("userData"), "bundles");
      if (!fs.existsSync(bundlesDir)) {
        fs.mkdirSync(bundlesDir, { recursive: true });
      }

      const destBundlePath = path.join(bundlesDir, `${videoId}.adaumc`);
      fs.copyFileSync(selectedPath, destBundlePath);

      const { metadata } = BundleManager.readMetadata(destBundlePath);

      const videoRecord = {
        id: videoId,
        title: metadata.title || fileName,
        duration: metadata.duration || 60,
        resolution: metadata.resolution || "1920x1080",
        tags: metadata.tags || [],
        bundlePath: destBundlePath,
        createdAt: new Date().toISOString(),
        playCount: 0,
        fileSize: inputSizeBytes,
      };

      db.saveVideo(videoRecord);
      activeImportTasks.delete(videoId);
      activeImportFilePaths.delete(normPath);
      activeImportFilePaths.delete(fileKey);

      broadcastProgress(1, 100, `Direct .adaumc import complete!`);
      return videoRecord;
    }

    // Prepare temp output directory
    const tempDir = path.join(app.getPath("userData"), `temp_${videoId}`);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const bundlesDir = path.join(app.getPath("userData"), "bundles");
    if (!fs.existsSync(bundlesDir)) fs.mkdirSync(bundlesDir, { recursive: true });

    const tempThumbPath = path.join(tempDir, "thumbnail.jpg");
    const tempGifPath = path.join(tempDir, "thumbnail.gif");
    const tempVttPath = path.join(tempDir, "preview.vtt");

    bundlePath = path.join(bundlesDir, `${videoId}.adaumc`);

    // Initialize Concurrent Video Packer to stream video in the background
    packer = new ConcurrentPacker(bundlePath);
    packer.startPackingVideo(selectedPath);

    // Step 0: Probe metadata
    broadcastProgress(1, 5, `Probing video resolution & real duration...`);

    const videoMeta = await FFmpegProcessor.getVideoMetadata(selectedPath);
    if (videoMeta.logs && Array.isArray(videoMeta.logs)) {
      logs.push(...videoMeta.logs);
    }
    logs.push(
      makeLog({
        event: "info",
        step: 0,
        stepName: "Init",
        msg: `Probed metadata: duration=${videoMeta.duration}s, resolution=${videoMeta.resolution}, codec=${videoMeta.codec}`,
        details: {
          durationSec: videoMeta.duration,
          resolution: videoMeta.resolution,
          codec: videoMeta.codec,
        },
      }),
    );

    // Secondary Duplicate Prevention Check (after metadata probe)
    const alreadyExists = db.getAllVideos().find(
      (v) =>
        v.title.toLowerCase() === fileName.toLowerCase() &&
        v.duration === videoMeta.duration &&
        v.resolution === videoMeta.resolution,
    );

    if (alreadyExists) {
      console.log(`[Import] Video '${fileName}' is already present. Skipping import.`);
      if (packer) {
        packer.abort();
      }
      if (fs.existsSync(bundlePath)) {
        try { fs.rmSync(bundlePath, { force: true }); } catch (e) {}
      }
      activeImportTasks.delete(videoId);
      activeImportFilePaths.delete(normPath);
      activeImportFilePaths.delete(fileKey);
      broadcastProgress(4, 100, `Video already present in library! Skipping import...`, 0);
      return alreadyExists;
    }

    checkCancelled();

    // Step 1: Extract Static Cover Thumbnail
    const thumbnailSeekSec = Math.min(180, Math.max(5, Math.floor(videoMeta.duration * 0.05)));
    broadcastProgress(
      1,
      10,
      `Step 1/4: Extracting static cover thumbnail at ${thumbnailSeekSec}s...`,
    );

    try {
      const thumbLogs = await FFmpegProcessor.generateStaticThumbnail(
        videoId,
        selectedPath,
        tempThumbPath,
        thumbnailSeekSec,
      );
      logs.push(...thumbLogs);
    } catch (e: any) {
      logs.push(
        makeLog({
          level: "warn",
          event: "warn",
          step: 1,
          stepName: "Static Thumbnail",
          msg: `Static thumbnail extraction notice: ${e.message}`,
          details: { errorMsg: e.message, errorStack: e.stack },
        }),
      );
    }

    checkCancelled();
    broadcastProgress(1, 100, `Step 1/4 Complete: Cover thumbnail extracted.`, 0);

    // Step 2: Generate Entire Video Summary GIF
    const step2Start = Date.now();
    broadcastProgress(2, 0, `Step 2/4: Extracting video summary clips...`);

    try {
      const gifLogs = await FFmpegProcessor.generateGifMedianCut(
        videoId,
        selectedPath,
        tempGifPath,
        videoMeta.duration,
        videoMeta.codec,
        (completed, total) => {
          const percent = Math.round((completed / total) * 100);
          const elapsed = (Date.now() - step2Start) / 1000;
          const rate = completed / Math.max(0.1, elapsed); // clips per second
          const remaining = total - completed;
          const eta = rate > 0 ? Math.round(remaining / rate) : null;
          broadcastProgress(
            2,
            percent,
            `Step 2/4: Extracting summary clips (${completed}/${total})...`,
            eta,
          );
        },
        () => !!activeImportTasks.get(videoId)?.isCancelled,
      );
      logs.push(...gifLogs);
    } catch (e: any) {
      logs.push(
        makeLog({
          level: "warn",
          event: "warn",
          step: 2,
          stepName: "Summary GIF",
          msg: `GIF generation notice: ${e.message}`,
          details: { errorMsg: e.message, errorStack: e.stack },
        }),
      );
    }

    checkCancelled();
    broadcastProgress(2, 100, `Step 2/4 Complete: Animated GIF summary preview generated.`, 0);

    // Step 3: Generate WebVTT Sprite Sheet
    broadcastProgress(3, 0, `Step 3/4: Generating timeline preview frames...`);

    try {
      const spriteRes = await FFmpegProcessor.generateSpriteSheetAndVTT(
        videoId,
        selectedPath,
        tempDir,
        videoMeta.duration,
        videoMeta.codec,
        ({ percentage, completedSecs, totalSecs, etaSeconds }: SpriteProgressUpdate) => {
          broadcastProgress(
            3,
            Math.round(percentage),
            `Step 3/4: Generating timeline frames (${completedSecs}/${totalSecs}s)...`,
            etaSeconds,
            completedSecs,
            totalSecs,
          );
        },
        () => !!activeImportTasks.get(videoId)?.isCancelled,
      );
      logs.push(...spriteRes.logs);
    } catch (e: any) {
      logs.push(
        makeLog({
          level: "warn",
          event: "warn",
          step: 3,
          stepName: "Sprite+VTT",
          msg: `Sprite grid notice: ${e.message}`,
          details: { errorMsg: e.message, errorStack: e.stack },
        }),
      );
    }

    checkCancelled();
    broadcastProgress(3, 100, `Step 3/4 Complete: WebVTT sprite sheets created.`, 0);

    function createFallbackImage(): Buffer {
      return Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );
    }

    if (!fs.existsSync(tempThumbPath))
      fs.writeFileSync(tempThumbPath, createFallbackImage());
    if (!fs.existsSync(tempGifPath))
      fs.writeFileSync(tempGifPath, createFallbackImage());
    if (!fs.existsSync(tempVttPath)) {
      fs.writeFileSync(
        tempVttPath,
        `WEBVTT\n\n00:00.000 --> 00:30.000\nadaumc://${videoId}/sprite_1#xywh=0,0,240,135\n`,
      );
    }

    // Step 4: Finalize Bundle
    broadcastProgress(4, 0, `Step 4/4: Finalizing bundle container...`);
    const step4T0 = Date.now();

    // Save full telemetry logs into container_telemetry.ndjson asset file
    const tempLogsPath = path.join(tempDir, "container_telemetry.ndjson");
    try {
      fs.writeFileSync(tempLogsPath, logs.join("\n"), "utf-8");
    } catch (e) {}

    const generatedAssets = [
      { key: "thumbnail", filePath: tempThumbPath, mimeType: "image/jpeg" },
      { key: "gif", filePath: tempGifPath, mimeType: "image/gif" },
      { key: "vtt", filePath: tempVttPath, mimeType: "text/vtt" },
      { key: "logs", filePath: tempLogsPath, mimeType: "application/x-ndjson" },
    ];

    const tempFiles = fs.existsSync(tempDir) ? fs.readdirSync(tempDir) : [];
    const spriteFiles = tempFiles
      .filter((f) => f.startsWith("sprite_") && f.endsWith(".jpg"))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.match(/\d+/)?.[0] || "0");
        return numA - numB;
      });

    spriteFiles.forEach((file, idx) => {
      generatedAssets.push({
        key: `sprite_${idx + 1}`,
        filePath: path.join(tempDir, file),
        mimeType: "image/jpeg",
      });
    });

    logs.push(
      makeLog({
        event: "step_start",
        step: 4,
        stepName: "Bundle Pack",
        msg: `Packing ${generatedAssets.length} assets into .adaumc container`,
        details: { assetCount: generatedAssets.length, bundlePath },
      }),
    );

    await packer!.finalizeBundle(
      videoId,
      fileName,
      videoMeta.duration,
      videoMeta.resolution,
      [],
      logs,
      generatedAssets,
    );

    logs.push(
      makeLog({
        event: "step_end",
        step: 4,
        stepName: "Bundle Pack",
        durationMs: Date.now() - step4T0,
      }),
    );

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}

    const processingTime = Math.round((Date.now() - startTime) / 1000);
    logs.push(
      makeLog({
        event: "info",
        step: 4,
        stepName: "Bundle Pack",
        msg: `SUCCESS: .adaumc bundle created in ${processingTime}s`,
        details: { processingTimeSec: processingTime, bundlePath },
      }),
    );

    const videoRecord = {
      id: videoId,
      title: fileName,
      duration: videoMeta.duration,
      resolution: videoMeta.resolution,
      tags: [],
      bundlePath,
      createdAt: new Date().toISOString(),
      playCount: 0,
      fileSize: inputSizeBytes,
    };

    db.saveVideo(videoRecord);
    activeImportTasks.delete(videoId);
    activeImportFilePaths.delete(normPath);
    activeImportFilePaths.delete(fileKey);

    broadcastProgress(4, 100, `Processing complete!`, 0);
    return videoRecord;
  } catch (error: any) {
    // Cleanup on error or cancellation
    if (packer) {
      packer.abort();
    }
    if (bundlePath && fs.existsSync(bundlePath)) {
      try {
        fs.rmSync(bundlePath, { force: true });
      } catch (e) {}
    }
    activeImportTasks.delete(videoId);
    activeImportFilePaths.delete(normPath);
    activeImportFilePaths.delete(fileKey);
    try {
      const tempDir = path.join(app.getPath("userData"), `temp_${videoId}`);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {}

    console.error(`[Import Error] Video processing failed for ${videoId}:`, error);
    throw error;
  }
}
