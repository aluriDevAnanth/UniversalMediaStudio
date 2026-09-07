import path from "path";
import fs from "fs";
import os from "os";
import { FFmpegProcessor, makeLog } from "./ffmpeg_processor";
import { getBundlesDir, getTempProcessingDir } from "./paths";
import { BundleManager } from "./bundle_manager";
import { db, VideoRecord } from "./db";
import { ConcurrentPacker } from "./concurrent_packer";
import { GLOBAL_DEFERRED_ASSET_QUEUE } from "./deferred_asset_queue";

// Lower background process priority so desktop UI remains 60FPS smooth
try {
  os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
} catch {}

export function getUserDataDir(): string {
  if (process.env.UMS_USER_DATA_DIR) {
    return process.env.UMS_USER_DATA_DIR;
  }
  try {
    const electron = require("electron");
    const app = electron?.app || electron?.default?.app;
    if (app && typeof app.getPath === "function") {
      return app.getPath("userData");
    }
  } catch {}
  return path.join(require("os").homedir(), ".universal_media_studio");
}

export interface ProgressUpdate {
  taskId: string;
  fileName: string;
  step: number;
  totalSteps: number;
  percent: number;
  workDone?: number;
  totalWork?: number;
  log?: string;
  etaSeconds: number | null;
}

export type ImportProgress = ProgressUpdate;

export class VideoImportQueue {
  private queue: {
    taskId: string;
    resolve: () => void;
    reject: (err: Error) => void;
    onPositionChange?: (pos: number) => void;
  }[] = [];
  private activeCount = 0;

  constructor(private limit: number) {}

  public async acquire(
    taskId: string,
    onPositionChange?: (pos: number) => void,
  ): Promise<void> {
    if (this.activeCount < this.limit) {
      this.activeCount++;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ taskId, resolve, reject, onPositionChange });
      if (onPositionChange) {
        onPositionChange(this.queue.length);
      }
    });
  }

  public release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.queue.forEach((item, index) => {
          if (item.onPositionChange) {
            item.onPositionChange(index + 1);
          }
        });
        next.resolve();
      }
    } else {
      this.activeCount = Math.max(0, this.activeCount - 1);
    }
  }

  public getQueuePosition(taskId: string): number {
    const idx = this.queue.findIndex((item) => item.taskId === taskId);
    return idx >= 0 ? idx + 1 : 0;
  }

  public cancel(taskId: string): void {
    const idx = this.queue.findIndex((item) => item.taskId === taskId);
    if (idx !== -1) {
      const [removed] = this.queue.splice(idx, 1);
      removed.reject(new Error("Import cancelled while in queue"));
    }
  }
}

const CPU_CORES = typeof os !== "undefined" && os.cpus ? os.cpus().length : 4;
export const GLOBAL_VIDEO_IMPORT_QUEUE = new VideoImportQueue(
  Math.min(8, Math.max(2, CPU_CORES - 1)),
);

export const activeImportTasks = new Map<string, { videoId: string; isCancelled: boolean }>();

export function cancelActiveImport(taskId?: string): void {
  if (taskId) {
    GLOBAL_VIDEO_IMPORT_QUEUE.cancel(taskId);
    const task = activeImportTasks.get(taskId);
    if (task) {
      task.isCancelled = true;
      FFmpegProcessor.killActiveChildProcesses(taskId);
      console.log(`[Import] Cancelled active import task and killed processes for taskId: ${taskId}`);
    }
  } else {
    for (const [id, task] of activeImportTasks.entries()) {
      GLOBAL_VIDEO_IMPORT_QUEUE.cancel(id);
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
  initialCreatedAt?: string,
): Promise<VideoRecord | null> {
  const fileCreatedAt = initialCreatedAt || new Date().toISOString();
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

  let lastBroadcastTime = 0;
  let lastBroadcastPercent = -1;

  const broadcastProgress = (
    step: number,
    percent: number,
    log: string,
    etaSeconds: number | null = null,
    workDone?: number,
    totalWork?: number,
    force = false,
  ) => {
    const now = Date.now();
    // Throttle progress updates to at most once every 200ms per task, unless 0%, 100%, or forced
    if (
      !force &&
      percent !== 0 &&
      percent !== 100 &&
      percent === lastBroadcastPercent &&
      now - lastBroadcastTime < 200
    ) {
      return;
    }
    if (!force && percent !== 0 && percent !== 100 && now - lastBroadcastTime < 200) {
      return;
    }
    lastBroadcastTime = now;
    lastBroadcastPercent = percent;

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

  if (activeImportFilePaths.has(normPath) || activeImportFilePaths.has(fileKey)) {
    console.log(`[Import Pre-check] Video '${fileName}' is currently being imported in another active task. Skipping.`);
    broadcastProgress(4, 100, `Video '${fileName}' is already importing...`, 0, undefined, undefined, true);
    return null;
  }

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
    broadcastProgress(4, 100, `Video '${fileName}' is already present in your library!`, 0, undefined, undefined, true);
    return existingRecord;
  }

  activeImportTasks.set(videoId, { videoId, isCancelled: false });
  activeImportFilePaths.add(normPath);
  activeImportFilePaths.add(fileKey);

  broadcastProgress(0, 0, "Initializing import...");

  let acquiredQueueSlot = false;
  let bundlePath = "";

  try {
    // Acquire slot in the global import queue (dynamic pool)
    await GLOBAL_VIDEO_IMPORT_QUEUE.acquire(videoId, (pos) => {
      broadcastProgress(0, 0, `Queued for processing (waiting in queue: position ${pos})...`);
    });
    acquiredQueueSlot = true;

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
          cpuCores: CPU_CORES,
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

    if (selectedPath.endsWith(".adaumc")) {
      broadcastProgress(1, 50, `Importing pre-built .adaumc container file...`);

      const bundlesDir = getBundlesDir();
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
        createdAt: fileCreatedAt,
        playCount: 0,
        fileSize: inputSizeBytes,
      };

      db.saveVideo(videoRecord);
      activeImportTasks.delete(videoId);
      activeImportFilePaths.delete(normPath);
      activeImportFilePaths.delete(fileKey);

      broadcastProgress(1, 100, `Direct .adaumc import complete!`, 0, undefined, undefined, true);
      return videoRecord;
    }

    const tempDir = getTempProcessingDir(videoId);
    const bundlesDir = getBundlesDir();

    const tempThumbPath = path.join(tempDir, "thumbnail.jpg");
    const tempVttPath = path.join(tempDir, "preview.vtt");

    bundlePath = path.join(bundlesDir, `${videoId}.adaumc`);

    // Probe metadata & Start background XOR stream
    broadcastProgress(1, 5, `Probing video resolution & metadata...`);

    const videoMeta = await FFmpegProcessor.getVideoMetadata(selectedPath);
    if (videoMeta.logs && Array.isArray(videoMeta.logs)) {
      logs.push(...videoMeta.logs);
    }

    // Initialize Concurrent Video Packer to stream video directly into container
    packer = new ConcurrentPacker(bundlePath);
    packer.startPackingVideo(selectedPath, (percent) => {
      broadcastProgress(4, percent, `Streaming & encrypting video data (${percent}%)...`);
    });

    logs.push(
      makeLog({
        event: "info",
        step: 1,
        stepName: "Init",
        msg: `Probed metadata: duration=${videoMeta.duration}s, resolution=${videoMeta.resolution}, codec=${videoMeta.codec}`,
        details: {
          durationSec: videoMeta.duration,
          resolution: videoMeta.resolution,
          codec: videoMeta.codec,
        },
      }),
    );

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
      broadcastProgress(4, 100, `Video already present in library! Skipping import...`, 0, undefined, undefined, true);
      return alreadyExists;
    }

    checkCancelled();

    // Extract Static Cover Thumbnail (1 frame instant extraction)
    const thumbnailSeekSec = Math.min(180, Math.max(5, Math.floor(videoMeta.duration * 0.05)));
    broadcastProgress(
      1,
      15,
      `Extracting cover thumbnail at ${thumbnailSeekSec}s...`,
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
    broadcastProgress(1, 30, `Cover thumbnail extracted.`, 0);

    function createFallbackImage(): Buffer {
      return Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );
    }

    if (!fs.existsSync(tempThumbPath)) {
      fs.writeFileSync(tempThumbPath, createFallbackImage());
    }

    // Default VTT fallback stub pointing to thumbnail until deferred sprite extraction completes
    fs.writeFileSync(
      tempVttPath,
      `WEBVTT\n\n00:00.000 --> 99:59.000\nadaumc://${videoId}/thumbnail\n`,
    );

    // Finalize Initial Bundle for Instant Playback
    broadcastProgress(4, 30, `Streaming video data & preparing bundle...`);
    const step4T0 = Date.now();

    // Save full telemetry logs into container_telemetry.ndjson asset file
    const tempLogsPath = path.join(tempDir, "container_telemetry.ndjson");
    try {
      fs.writeFileSync(tempLogsPath, logs.join("\n"), "utf-8");
    } catch (e) {}

    const initialAssets = [
      { key: "thumbnail", filePath: tempThumbPath, mimeType: "image/jpeg" },
      { key: "vtt", filePath: tempVttPath, mimeType: "text/vtt" },
      { key: "logs", filePath: tempLogsPath, mimeType: "application/x-ndjson" },
    ];

    logs.push(
      makeLog({
        event: "step_start",
        step: 4,
        stepName: "Bundle Pack",
        msg: `Packing initial ${initialAssets.length} assets into .adaumc container`,
        details: { assetCount: initialAssets.length, bundlePath },
      }),
    );

    await packer!.finalizeBundle(
      videoId,
      fileName,
      videoMeta.duration,
      videoMeta.resolution,
      [],
      logs,
      initialAssets,
    );

    broadcastProgress(4, 98, `Finalizing container metadata...`);

    logs.push(
      makeLog({
        event: "step_end",
        step: 4,
        stepName: "Bundle Pack",
        durationMs: Date.now() - step4T0,
      }),
    );

    const processingTime = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    logs.push(
      makeLog({
        event: "info",
        step: 4,
        stepName: "Bundle Pack",
        msg: `SUCCESS: Initial .adaumc bundle created in ${processingTime}s`,
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
      createdAt: fileCreatedAt,
      playCount: 0,
      fileSize: inputSizeBytes,
    };

    // Save immediately so video appears in UI and is playable
    db.saveVideo(videoRecord);
    activeImportTasks.delete(videoId);
    activeImportFilePaths.delete(normPath);
    activeImportFilePaths.delete(fileKey);

    // Queue background enrichment for Summary GIF & WebVTT Sprites
    GLOBAL_DEFERRED_ASSET_QUEUE.enqueue({
      videoId,
      sourcePath: selectedPath,
      bundlePath,
      duration: videoMeta.duration,
      codec: videoMeta.codec,
      resolution: videoMeta.resolution,
    });

    broadcastProgress(4, 100, `Processing complete! Ready to play.`, 0, undefined, undefined, true);
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
      const tempDir = getTempProcessingDir(videoId);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {}

    if (
      error?.message === "Import cancelled" ||
      error?.message?.includes("cancelled while in queue")
    ) {
      console.log(`[Import] Task ${videoId} cancelled.`);
      return null;
    }

    console.error(`[Import Error] Video processing failed for ${videoId}:`, error);
    throw error;
  } finally {
    if (acquiredQueueSlot) {
      GLOBAL_VIDEO_IMPORT_QUEUE.release();
      acquiredQueueSlot = false;
    }
  }
}
