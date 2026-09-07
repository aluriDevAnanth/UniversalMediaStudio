import fs from "fs";
import path from "path";
import { FFmpegProcessor, makeLog } from "./ffmpeg_processor";
import { BundleManager } from "./bundle_manager";
import { getTempProcessingDir } from "./paths";

export interface DeferredTask {
  videoId: string;
  sourcePath: string;
  bundlePath: string;
  duration: number;
  codec?: string;
  resolution?: string;
  onEnriched?: (videoId: string) => void;
}

export class DeferredAssetQueue {
  private queue: DeferredTask[] = [];
  private activeCount = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency = 1) {
    this.maxConcurrency = maxConcurrency;
  }

  public enqueue(task: DeferredTask): void {
    // Avoid duplicate enrichment tasks for same video
    if (this.queue.some((t) => t.videoId === task.videoId)) {
      return;
    }
    this.queue.push(task);
    this.processNext();
  }

  public get pendingCount(): number {
    return this.queue.length;
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;

    try {
      await this.executeTask(task);
    } catch (err: any) {
      console.warn(`[Deferred Asset Enrichment] Notice for ${task.videoId}: ${err?.message}`);
    } finally {
      this.activeCount--;
      // Small yield before picking next item
      setImmediate(() => this.processNext());
    }
  }

  private async executeTask(task: DeferredTask): Promise<void> {
    const { videoId, sourcePath, bundlePath, duration, codec } = task;

    // If bundle or source no longer exists (e.g. deleted by user), skip
    if (!fs.existsSync(bundlePath) || !fs.existsSync(sourcePath)) {
      return;
    }

    const tempDir = getTempProcessingDir(videoId);
    const tempGifPath = path.join(tempDir, "thumbnail.gif");
    const tempVttPath = path.join(tempDir, "preview.vtt");

    const logs: string[] = [];

    logs.push(
      makeLog({
        event: "info",
        step: 2,
        stepName: "Deferred Enrichment",
        msg: `Starting background preview enrichment for '${videoId}'`,
        details: { videoId, duration },
      }),
    );

    // 1. Generate Summary GIF in background
    try {
      const gifLogs = await FFmpegProcessor.generateGifMedianCut(
        videoId,
        sourcePath,
        tempGifPath,
        duration,
        codec,
      );
      if (gifLogs) logs.push(...gifLogs);
    } catch (e: any) {
      logs.push(
        makeLog({
          level: "warn",
          event: "warn",
          step: 2,
          stepName: "Deferred GIF",
          msg: `Background GIF generation notice: ${e.message}`,
        }),
      );
    }

    // 2. Generate Timeline WebVTT & Sprites
    try {
      const spriteRes = await FFmpegProcessor.generateSpriteSheetAndVTT(
        videoId,
        sourcePath,
        tempDir,
        duration,
        codec,
      );
      if (spriteRes?.logs) logs.push(...spriteRes.logs);
    } catch (e: any) {
      logs.push(
        makeLog({
          level: "warn",
          event: "warn",
          step: 3,
          stepName: "Deferred Sprites",
          msg: `Background sprite generation notice: ${e.message}`,
        }),
      );
    }

    // 3. Assemble generated assets
    const generatedAssets: { key: string; filePath: string; mimeType: string }[] = [];

    if (fs.existsSync(tempGifPath)) {
      generatedAssets.push({
        key: "gif",
        filePath: tempGifPath,
        mimeType: "image/gif",
      });
    }

    if (fs.existsSync(tempVttPath)) {
      generatedAssets.push({
        key: "vtt",
        filePath: tempVttPath,
        mimeType: "text/vtt",
      });
    }

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

    // 4. Append to .adaumc bundle and update header in-place
    if (generatedAssets.length > 0 && fs.existsSync(bundlePath)) {
      await BundleManager.appendAssetsToBundle(bundlePath, generatedAssets);
      console.log(
        `[Deferred Asset Enrichment] Appended ${generatedAssets.length} assets to bundle for ${videoId}`,
      );
    }

    // 5. Cleanup temp working directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}

    if (task.onEnriched) {
      task.onEnriched(videoId);
    }
  }
}

export const GLOBAL_DEFERRED_ASSET_QUEUE = new DeferredAssetQueue(1);
