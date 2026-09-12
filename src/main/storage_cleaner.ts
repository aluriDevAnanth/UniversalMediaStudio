import fs from "fs";
import path from "path";
import { db } from "./db";
import { getBundlesDir, getTempDir } from "./paths";
import { activeImportTasks } from "./random_video";

export interface CleanupResult {
  success: boolean;
  deletedBundles: string[];
  deletedTempDirs: string[];
  deletedCount: number;
  freedBytes: number;
  errors: string[];
}

export class StorageCleaner {
  private timer: NodeJS.Timeout | null = null;
  private isCleaning = false;
  private readonly defaultIntervalMs: number;
  private readonly gracePeriodMs: number;

  constructor(options?: { intervalMs?: number; gracePeriodMs?: number }) {
    this.defaultIntervalMs = options?.intervalMs ?? 60_000; // 1 minute
    this.gracePeriodMs = options?.gracePeriodMs ?? 120_000; // 2 minutes grace period
  }

  /**
   * Starts periodic background sweeps (every minute by default).
   * Runs non-blocking and unref'd.
   */
  public start(intervalMs?: number): void {
    if (this.timer) {
      clearInterval(this.timer);
    }

    const interval = intervalMs ?? this.defaultIntervalMs;
    console.log(
      `[StorageCleaner] Starting background cleaner (interval: ${interval / 1000}s, grace: ${this.gracePeriodMs / 1000}s)`,
    );

    // Initial delayed run after 5s, then recurring
    setTimeout(() => {
      this.cleanOrphansNow().catch((err) => {
        console.error("[StorageCleaner] Error in initial cleanup sweep:", err);
      });
    }, 5000);

    this.timer = setInterval(() => {
      this.cleanOrphansNow().catch((err) => {
        console.error("[StorageCleaner] Error in scheduled cleanup sweep:", err);
      });
    }, interval);

    // Ensure timer does not prevent process exit if needed
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Stops background periodic sweep timer.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[StorageCleaner] Background cleaner stopped.");
    }
  }

  /**
   * Performs a single non-blocking cleanup pass over data/bundles and data/temp.
   */
  public async cleanOrphansNow(): Promise<CleanupResult> {
    if (this.isCleaning) {
      console.log("[StorageCleaner] Previous sweep still in progress, skipping.");
      return {
        success: false,
        deletedBundles: [],
        deletedTempDirs: [],
        deletedCount: 0,
        freedBytes: 0,
        errors: ["Cleanup already in progress"],
      };
    }

    this.isCleaning = true;
    const result: CleanupResult = {
      success: true,
      deletedBundles: [],
      deletedTempDirs: [],
      deletedCount: 0,
      freedBytes: 0,
      errors: [],
    };

    try {
      // 1. Gather all active referenced video bundle paths
      const activeVideos = db.getAllVideos();
      const activeBundlePaths = new Set<string>();
      const activeVideoIds = new Set<string>();

      for (const video of activeVideos) {
        if (video.id) activeVideoIds.add(video.id);
        if (video.bundlePath) {
          activeBundlePaths.add(path.resolve(video.bundlePath));
          activeBundlePaths.add(path.basename(video.bundlePath));
        }
      }

      // 2. Gather active in-flight import task IDs & paths
      for (const [taskId, task] of activeImportTasks.entries()) {
        activeVideoIds.add(taskId);
        if (task.videoId) {
          activeVideoIds.add(task.videoId);
        }
      }

      const now = Date.now();
      const cutoffTime = now - this.gracePeriodMs;

      // 3. Scan bundles directory non-blocking
      const bundlesDir = getBundlesDir();
      if (fs.existsSync(bundlesDir)) {
        const bundleFiles = await fs.promises.readdir(bundlesDir);

        for (const file of bundleFiles) {
          const fullPath = path.join(bundlesDir, file);
          const resolvedPath = path.resolve(fullPath);

          // If active in database, never touch
          if (activeBundlePaths.has(resolvedPath) || activeBundlePaths.has(file)) {
            continue;
          }

          // Check if file is related to an active import task ID
          let isBelongingToActiveTask = false;
          for (const activeId of activeVideoIds) {
            if (file.includes(activeId)) {
              isBelongingToActiveTask = true;
              break;
            }
          }
          if (isBelongingToActiveTask) {
            continue;
          }

          try {
            const stat = await fs.promises.stat(fullPath);
            const fileTime = Math.max(stat.mtimeMs || 0, stat.birthtimeMs || 0, stat.ctimeMs || 0);

            // Safety check: Preserve files created within grace period
            if (this.gracePeriodMs > 0 && fileTime > cutoffTime && stat.size > 0) {
              continue;
            }

            // Unlink orphaned bundle or temp file
            await fs.promises.unlink(fullPath);
            result.deletedBundles.push(file);
            result.deletedCount++;
            result.freedBytes += stat.size;
          } catch (e: any) {
            result.errors.push(`Failed to clean bundle ${file}: ${e.message}`);
          }
        }
      }

      // 4. Scan temp processing directory for abandoned scratch folders
      const tempDir = getTempDir();
      if (fs.existsSync(tempDir)) {
        const tempEntries = await fs.promises.readdir(tempDir);

        for (const entry of tempEntries) {
          const entryPath = path.join(tempDir, entry);

          try {
            const stat = await fs.promises.stat(entryPath);
            if (stat.isDirectory()) {
              // Extract potential taskId (e.g. "temp_vid_12345" -> "vid_12345")
              const folderId = entry.replace(/^temp_/, "");

              // Check if actively importing
              if (activeVideoIds.has(folderId) || activeImportTasks.has(folderId)) {
                continue;
              }

              const folderTime = Math.max(stat.mtimeMs || 0, stat.birthtimeMs || 0);
              // Safety check: Preserve temp folders modified within grace period
              if (this.gracePeriodMs > 0 && folderTime > cutoffTime) {
                continue;
              }

              await fs.promises.rm(entryPath, { recursive: true, force: true });
              result.deletedTempDirs.push(entry);
              result.deletedCount++;
            }
          } catch (e: any) {
            result.errors.push(`Failed to clean temp entry ${entry}: ${e.message}`);
          }
        }
      }

      if (result.deletedCount > 0) {
        const freedMB = (result.freedBytes / (1024 * 1024)).toFixed(2);
        console.log(
          `[StorageCleaner] Cleaned ${result.deletedBundles.length} orphaned bundle(s) and ${result.deletedTempDirs.length} temp dir(s). Reclaimed ${freedMB} MB.`,
        );
      }
    } catch (err: any) {
      result.success = false;
      result.errors.push(err.message || String(err));
      console.error("[StorageCleaner] Unexpected sweep error:", err);
    } finally {
      this.isCleaning = false;
    }

    return result;
  }
}

export const storageCleaner = new StorageCleaner();
