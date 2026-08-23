import { exec, execSync, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { FFmpegManager } from "./ffmpeg_manager";

export const activeChildProcesses = new Map<string, Set<ChildProcess>>();

export function registerChildProcess(videoId: string, child: ChildProcess) {
  let set = activeChildProcesses.get(videoId);
  if (!set) {
    set = new Set();
    activeChildProcesses.set(videoId, set);
  }
  set.add(child);
  child.on("close", () => {
    set.delete(child);
    if (set.size === 0) {
      activeChildProcesses.delete(videoId);
    }
  });
}

export function killActiveChildProcesses(videoId: string) {
  const set = activeChildProcesses.get(videoId);
  if (set) {
    for (const child of set) {
      try {
        if (process.platform === "win32" && child.pid) {
          execSync(`taskkill /F /T /PID ${child.pid}`);
        } else {
          child.kill("SIGKILL");
        }
      } catch (e) {
        console.error(`Failed to kill process tree for video ${videoId}`, e);
      }
    }
    activeChildProcesses.delete(videoId);
  }
}

export interface ProcessMediaResult {
  thumbnailPath: string;
  gifPath: string;
  vttPath: string;
  spritePaths: string[];
  logs: string[];
}

const EXEC_OPTIONS = { maxBuffer: 50 * 1024 * 1024 };

/** Progress metadata emitted on every VTT/sprite chunk update */
export interface SpriteProgressUpdate {
  percentage: number;    // 0 to 100
  completedSecs: number; // Video seconds processed so far
  totalSecs: number;     // Total video seconds
  etaSeconds: number;    // Estimated seconds remaining
}

/** Structured NDJSON log entry for the import pipeline timeline */
export interface LogEntry {
  t: string;
  level?: "debug" | "info" | "warn" | "error";
  event:
    | "step_start"
    | "step_end"
    | "unit_start"
    | "unit_end"
    | "cmd_exec"
    | "cmd_output"
    | "checkpoint"
    | "info"
    | "warn"
    | "error";
  step: number;
  stepName: string;
  durationMs?: number;
  unitIndex?: number;
  totalUnits?: number;
  unitName?: string;
  msg?: string;
  details?: Record<string, any>;
}

/** Returns a NDJSON string stamped with the current ISO timestamp and memory usage */
export const makeLog = (entry: Omit<LogEntry, "t">): string => {
  const memory = process.memoryUsage();
  const level =
    entry.level ||
    (entry.event === "error"
      ? "error"
      : entry.event === "warn"
      ? "warn"
      : entry.event === "cmd_exec" || entry.event === "cmd_output"
      ? "debug"
      : "info");
  return JSON.stringify({
    t: new Date().toISOString(),
    level,
    memoryMb: Math.round(memory.heapUsed / 1024 / 1024),
    ...entry,
  });
};

function formatVttTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((sec % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  const ms = Math.floor((sec % 1) * 1000)
    .toString()
    .padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

export class ImportSemaphore {
  private queue: (() => void)[] = [];
  private activeCount = 0;

  constructor(private limit: number) {}

  public async acquire(): Promise<void> {
    if (this.activeCount < this.limit) {
      this.activeCount++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  public release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.activeCount--;
    }
  }
}

export const GLOBAL_FFMPEG_SEMAPHORE = new ImportSemaphore(require("os").cpus().length || 4);

export class FFmpegProcessor {
  private static gpuCheckCache: string | null = null;

  public static async detectGPUSupport(): Promise<string> {
    if (this.gpuCheckCache) return this.gpuCheckCache;
    return new Promise((resolve) => {
      exec("nvidia-smi", (err) => {
        if (!err) {
          this.gpuCheckCache = "nvidia";
          resolve("nvidia");
        } else {
          this.gpuCheckCache = "cpu";
          resolve("cpu");
        }
      });
    });
  }

  public static killActiveChildProcesses(videoId: string): void {
    killActiveChildProcesses(videoId);
  }

  /**
   * Promise throttle queue/worker pool to run tasks in parallel with strict concurrency limits.
   */
  public static async runWithConcurrencyLimit(
    tasks: (() => Promise<void>)[],
    limit: number,
  ): Promise<void> {
    let nextTaskIndex = 0;
    const worker = async () => {
      while (nextTaskIndex < tasks.length) {
        const currentIndex = nextTaskIndex++;
        await tasks[currentIndex]();
      }
    };
    const workers = Array.from(
      { length: Math.min(limit, tasks.length) },
      () => worker(),
    );
    await Promise.all(workers);
  }

  public static async getVideoMetadata(
    inputVideo: string,
  ): Promise<{ duration: number; resolution: string; codec: string; logs: string[] }> {
    const logs: string[] = [];
    const t0 = Date.now();
    const ffprobeCmd = await FFmpegManager.getFFprobePath();
    const cmd = `${ffprobeCmd} -v quiet -print_format json -show_format -show_streams "${inputVideo}"`;

    logs.push(
      makeLog({
        level: "debug",
        event: "cmd_exec",
        step: 0,
        stepName: "Init",
        msg: `Running FFprobe metadata extraction command`,
        details: { cmd, inputVideo },
      }),
    );

    return new Promise((resolve) => {
      exec(
        cmd,
        { timeout: 10000, maxBuffer: 50 * 1024 * 1024 },
        (err, stdout, stderr) => {
          let duration = 60;
          let resolution = "1920x1080";
          let codec = "unknown";

          if (err) {
            logs.push(
              makeLog({
                level: "warn",
                event: "warn",
                step: 0,
                stepName: "Init",
                msg: `FFprobe notice: ${err.message}`,
                details: { errorMsg: err.message, stderr },
              }),
            );
          }

          if (!err && stdout) {
            try {
              const parsed = JSON.parse(stdout);
              if (parsed.format && parsed.format.duration) {
                const parsedDur = parseFloat(parsed.format.duration);
                if (!isNaN(parsedDur) && parsedDur > 0) {
                  duration = Math.round(parsedDur);
                }
              }

              if (parsed.streams && Array.isArray(parsed.streams)) {
                const videoStream = parsed.streams.find(
                  (s: any) => s.codec_type === "video" && s.width && s.height,
                );
                if (videoStream) {
                  resolution = `${videoStream.width}x${videoStream.height}`;
                  codec = videoStream.codec_name || "unknown";
                }
              }

              logs.push(
                makeLog({
                  level: "info",
                  event: "checkpoint",
                  step: 0,
                  stepName: "Init",
                  msg: `Parsed FFprobe metadata JSON successfully in ${Date.now() - t0}ms`,
                  details: { durationSec: duration, resolution, codec, streamCount: parsed.streams?.length || 0 },
                }),
              );
            } catch (e: any) {
              logs.push(
                makeLog({
                  level: "warn",
                  event: "warn",
                  step: 0,
                  stepName: "Init",
                  msg: `Failed to parse FFprobe stdout JSON: ${e.message}`,
                }),
              );
            }
          }

          // Fallback parse via ffmpeg -i stderr if ffprobe output was empty
          if (duration === 60) {
            FFmpegManager.getFFmpegPath().then((ffmpegCmd) => {
              const fallbackCmd = `${ffmpegCmd} -nostdin -hide_banner -i "${inputVideo}"`;
              logs.push(
                makeLog({
                  level: "warn",
                  event: "cmd_exec",
                  step: 0,
                  stepName: "Init",
                  msg: `FFprobe returned default duration. Triggering FFmpeg -i fallback metadata probe`,
                  details: { cmd: fallbackCmd },
                }),
              );
              exec(
                fallbackCmd,
                { timeout: 10000, maxBuffer: 50 * 1024 * 1024 },
                (_fErr, fStdout, fStderr) => {
                  const output = (fStderr || "") + (fStdout || "");
                  const durMatch = output.match(
                    /Duration:\s*(\d\d):(\d\d):(\d\d(?:\.\d+)?)/i,
                  );
                  if (durMatch) {
                    const hours = parseFloat(durMatch[1]);
                    const minutes = parseFloat(durMatch[2]);
                    const seconds = parseFloat(durMatch[3]);
                    const totalSec = Math.round(
                      hours * 3600 + minutes * 60 + seconds,
                    );
                    if (totalSec > 0) duration = totalSec;
                  }

                  const codecMatch = output.match(/Video:\s*([a-zA-Z0-9_-]+)/i);
                  if (codecMatch) {
                    codec = codecMatch[1].toLowerCase();
                  }

                  logs.push(
                    makeLog({
                      level: "info",
                      event: "checkpoint",
                      step: 0,
                      stepName: "Init",
                      msg: `FFmpeg fallback metadata probe complete`,
                      details: { durationSec: duration, resolution, codec },
                    }),
                  );

                  resolve({ duration, resolution, codec, logs });
                },
              );
            });
            return;
          }

          resolve({ duration, resolution, codec, logs });
        },
      );
    });
  }

  /**
   * Extracts static JPEG cover thumbnail frame from video (< 0.2s)
   */
  public static async generateStaticThumbnail(
    videoId: string | undefined,
    inputVideo: string,
    outputThumb: string,
    seekSec = 1,
  ): Promise<string[]> {
    const logs: string[] = [];
    const stepT0 = Date.now();
    const ffmpegCmd = await FFmpegManager.getFFmpegPath();
    const fastSeek = Math.max(0, seekSec - 2);
    const accurateSeek = seekSec - fastSeek;
    const cmd = `${ffmpegCmd} -y -nostdin -ss ${fastSeek} -i "${inputVideo}" -ss ${accurateSeek} -vframes 1 -q:v 2 "${outputThumb}"`;

    logs.push(
      makeLog({
        event: "step_start",
        step: 1,
        stepName: "Static Thumbnail",
        msg: `Extracting cover frame at seek=${seekSec}s`,
        details: { seekSec, fastSeek, accurateSeek, outputThumb },
      }),
    );

    const acquireT0 = Date.now();
    return new Promise(async (resolve) => {
      await GLOBAL_FFMPEG_SEMAPHORE.acquire();
      const semWaitMs = Date.now() - acquireT0;
      try {
        const child = exec(cmd, EXEC_OPTIONS, (err) => {
          if (err) {
            logs.push(
              makeLog({
                level: "warn",
                event: "warn",
                step: 1,
                stepName: "Static Thumbnail",
                msg: `Static frame extraction notice: ${err.message}`,
                details: { errorMsg: err.message },
              }),
            );
          } else {
            let sizeBytes = 0;
            try {
              if (fs.existsSync(outputThumb)) {
                // Stamp official .adaumc icon emblem onto thumbnail
                const iconPath = path.join(process.cwd(), "resources", "icon.png");
                if (fs.existsSync(iconPath)) {
                  require("sharp")(outputThumb)
                    .metadata()
                    .then((meta: any) => {
                      const w = meta.width || 640;
                      const h = meta.height || 360;
                      return require("sharp")(iconPath)
                        .resize({ width: 52, height: 52, fit: "inside" })
                        .toBuffer()
                        .then((iconBuf: Buffer) => {
                          return require("sharp")(outputThumb)
                            .composite([
                              {
                                input: iconBuf,
                                top: Math.max(0, h - 60),
                                left: Math.max(0, w - 60),
                                blend: "over",
                              },
                            ])
                            .toBuffer();
                        })
                        .then((stampedBuf: Buffer) => {
                          fs.writeFileSync(outputThumb, stampedBuf);
                        });
                    })
                    .catch((stampErr: any) => {
                      console.error("Failed to stamp .adaumc icon onto thumbnail:", stampErr);
                    });
                }
                sizeBytes = fs.statSync(outputThumb).size;
              }
            } catch (e) {}
            logs.push(
              makeLog({
                event: "step_end",
                step: 1,
                stepName: "Static Thumbnail",
                durationMs: Date.now() - stepT0,
                details: { fileStats: { path: outputThumb, sizeBytes }, semWaitMs },
              }),
            );
          }
          resolve(logs);
        });

        if (child) {
          logs.push(
            makeLog({
              level: "debug",
              event: "cmd_exec",
              step: 1,
              stepName: "Static Thumbnail",
              msg: `Executing FFmpeg static thumbnail command`,
              details: { cmd, pid: child.pid, semWaitMs },
            }),
          );
        }

        if (videoId && child) {
          registerChildProcess(videoId, child);
        }
      } finally {
        GLOBAL_FFMPEG_SEMAPHORE.release();
      }
    });
  }

  public static async generateGifMedianCut(
    videoId: string | undefined,
    inputVideo: string,
    outputGif: string,
    totalDurationSec = 60,
    _codec = "unknown",
    onClipProgress?: (completed: number, total: number) => void,
    isCancelled?: () => boolean,
  ): Promise<string[]> {
    const logs: string[] = [];
    const stepT0 = Date.now();
    const tempDir = path.dirname(outputGif);
    const ffmpegCmd = await FFmpegManager.getFFmpegPath();
    const dur = Math.max(1, totalDurationSec);

    // Calculate dynamic clip intervals (VTT intervals scaled by 10x)
    let interval = 10.0;
    if (dur <= 600) {
      interval = 10.0;
    } else if (dur <= 1800) {
      interval = 20.0;
    } else if (dur <= 3600) {
      interval = 30.0;
    } else if (dur <= 7200) {
      interval = 40.0;
    } else {
      interval = 50.0;
    }

    // Limit maximum clips to 15 to keep processing time and file size extremely small
    const numClips = Math.min(15, Math.max(6, Math.ceil(dur / interval)));
    const clipDuration = dur <= 15 ? 0.6 : 0.8;

    logs.push(
      makeLog({
        event: "step_start",
        step: 2,
        stepName: "Summary GIF",
        totalUnits: numClips,
        msg: `${totalDurationSec}s video, ${numClips} clips calculated`,
        details: { durationSec: dur, intervalSec: interval, numClips, clipDuration },
      }),
    );

    // Distribute sample points uniformly across timeline (5% to 95%)
    const percentageOffsets: number[] = [];
    for (let i = 0; i < numClips; i++) {
      const pct = 0.05 + (i / Math.max(1, numClips - 1)) * 0.90;
      percentageOffsets.push(pct);
    }

    const segFiles: string[] = [];
    const concurrencyLimit = (require("os").cpus().length || 4) * 2;
    let completedClips = 0;
    const clipTasks = percentageOffsets.map((offset, i) => {
      return async () => {
        if (isCancelled && isCancelled()) return;

        const timeSec = Math.max(0, Number((dur * offset).toFixed(2)));
        const segFile = path.join(tempDir, `gif_seg_${i}_${Date.now()}.mp4`);
        segFiles.push(segFile);
        const clipT0 = Date.now();

        // Fast seeking with -ss before -i, limited to 1 thread for light CPU footprint
        const cmd = `${ffmpegCmd} -y -threads 1 -nostdin -ss ${timeSec} -t ${clipDuration} -i "${inputVideo}" -vf "fps=8,scale=320:-1:flags=lanczos" -an "${segFile}"`;

        logs.push(
          makeLog({
            event: "unit_start",
            step: 2,
            stepName: "Summary GIF",
            unitIndex: i + 1,
            totalUnits: numClips,
            unitName: `clip_${i + 1}`,
            msg: `seek=${timeSec}s offset=${(offset * 100).toFixed(1)}%`,
            details: { seekSec: timeSec, pctOffset: offset, targetSegFile: segFile, cmd },
          }),
        );

        const semT0 = Date.now();
        await GLOBAL_FFMPEG_SEMAPHORE.acquire();
        const semWaitMs = Date.now() - semT0;
        try {
          if (isCancelled && isCancelled()) return;
          await new Promise<void>((resolve) => {
            const child = exec(cmd, EXEC_OPTIONS, () => {
              completedClips++;
              let segSizeBytes = 0;
              try {
                if (fs.existsSync(segFile)) {
                  segSizeBytes = fs.statSync(segFile).size;
                }
              } catch (e) {}

              logs.push(
                makeLog({
                  event: "unit_end",
                  step: 2,
                  stepName: "Summary GIF",
                  unitIndex: i + 1,
                  totalUnits: numClips,
                  unitName: `clip_${i + 1}`,
                  durationMs: Date.now() - clipT0,
                  details: { fileStats: { path: segFile, sizeBytes: segSizeBytes }, semWaitMs },
                }),
              );
              if (onClipProgress) {
                onClipProgress(completedClips, numClips);
              }
              resolve();
            });

            if (child) {
              logs.push(
                makeLog({
                  level: "debug",
                  event: "cmd_exec",
                  step: 2,
                  stepName: "Summary GIF",
                  unitIndex: i + 1,
                  totalUnits: numClips,
                  unitName: `clip_${i + 1}`,
                  msg: `Executing clip extraction command`,
                  details: { cmd, pid: child.pid },
                }),
              );
            }

            if (videoId && child) {
              registerChildProcess(videoId, child);
            }
          });
        } finally {
          GLOBAL_FFMPEG_SEMAPHORE.release();
        }
      };
    });

    await FFmpegProcessor.runWithConcurrencyLimit(clipTasks, concurrencyLimit);

    if (isCancelled && isCancelled()) {
      logs.push(
        makeLog({
          level: "warn",
          event: "warn",
          step: 2,
          stepName: "Summary GIF",
          msg: `Summary GIF generation cancelled by user`,
        }),
      );
      return logs;
    }

    const existingSegs = segFiles.filter((f) => fs.existsSync(f));

    if (existingSegs.length === 0) {
      logs.push(
        makeLog({
          level: "warn",
          event: "warn",
          step: 2,
          stepName: "Summary GIF",
          msg: `No clip segments generated. Triggering fast keyframe extraction fallback`,
        }),
      );
      const fallbackCmd = `${ffmpegCmd} -y -nostdin -ss 1 -t 4 -i "${inputVideo}" -vf "fps=8,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -an "${outputGif}"`;

      await GLOBAL_FFMPEG_SEMAPHORE.acquire();
      try {
        await new Promise((r) => {
          const child = exec(fallbackCmd, EXEC_OPTIONS, () => r(null));
          if (videoId && child) {
            registerChildProcess(videoId, child);
          }
        });
      } finally {
        GLOBAL_FFMPEG_SEMAPHORE.release();
      }
      return logs;
    }

    const inputConcat = existingSegs.map((p) => `-i "${p}"`).join(" ");
    const streamLabels = existingSegs.map((_, idx) => `[${idx}:v]`).join("");

    const durationMins = dur / 60.0;
    const getOptimalThreadCount = (mins: number): number => {
      const cpuCount = require("os").cpus().length || 4;
      if (mins < 30) return 1;
      const needed = Math.max(2, Math.floor(mins / 30));
      const maxCap = Math.min(8, cpuCount);
      return Math.min(maxCap, needed);
    };
    const num_threads = getOptimalThreadCount(durationMins);

    const filterGen = `${streamLabels}concat=n=${existingSegs.length}:v=1:a=0,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=sierra2_4a`;
    const compileCmd = `${ffmpegCmd} -y -nostdin ${inputConcat} -filter_complex "${filterGen}" -threads ${num_threads} -an "${outputGif}"`;

    logs.push(
      makeLog({
        level: "debug",
        event: "cmd_exec",
        step: 2,
        stepName: "Summary GIF",
        msg: `Compiling ${existingSegs.length} clip segments into final palette-optimized GIF`,
        details: { compileCmd, threads: num_threads, filterGen },
      }),
    );

    const compileT0 = Date.now();
    await GLOBAL_FFMPEG_SEMAPHORE.acquire();
    try {
      await new Promise((resolve) => {
        const child = exec(compileCmd, EXEC_OPTIONS, () => resolve(null));
        if (videoId && child) {
          registerChildProcess(videoId, child);
        }
      });
    } finally {
      GLOBAL_FFMPEG_SEMAPHORE.release();
    }

    // Cleanup temp segment mp4 files
    let cleanedCount = 0;
    for (const f of existingSegs) {
      try {
        fs.unlinkSync(f);
        cleanedCount++;
      } catch (e) {}
    }

    logs.push(
      makeLog({
        event: "checkpoint",
        step: 2,
        stepName: "Summary GIF",
        msg: `Cleaned up ${cleanedCount} temporary GIF segment files`,
      }),
    );

    let gifSizeBytes = 0;
    try {
      if (fs.existsSync(outputGif)) {
        gifSizeBytes = fs.statSync(outputGif).size;
      }
    } catch (e) {}

    logs.push(
      makeLog({
        event: "step_end",
        step: 2,
        stepName: "Summary GIF",
        durationMs: Date.now() - stepT0,
        details: {
          fileStats: { path: outputGif, sizeBytes: gifSizeBytes },
          compileDurationMs: Date.now() - compileT0,
          segmentCount: existingSegs.length,
        },
      }),
    );
    return logs;
  }

  /**
   * Ultra-Fast WebVTT Sprite Sheet Generator (adapted from YTDLPY):
   * - Divides video duration into `num_threads` chunks.
   * - Executes parallel chunk sprite generation with built-in tile filter inside FFmpeg.
   * - Re-arranges and renames generated sprite grids.
   */
  public static async generateSpriteSheetAndVTT(
    videoId: string,
    inputVideo: string,
    outputDir: string,
    durationSec: number,
    codec = "unknown",
    onTileProgress?: (progress: SpriteProgressUpdate) => void,
    isCancelled?: () => boolean,
  ): Promise<{ vttPath: string; spritePaths: string[]; logs: string[] }> {
    const logs: string[] = [];
    const stepT0 = Date.now();
    const vttPath = path.join(outputDir, "preview.vtt");
    const ffmpegCmd = await FFmpegManager.getFFmpegPath();
    const dur = Math.max(1, durationSec);
    const durationMins = dur / 60.0;

    // Get dynamic VTT interval mapping
    let interval = 1.0;
    if (dur <= 600) {
      interval = 1.0;
    } else if (dur <= 1800) {
      interval = 2.0;
    } else if (dur <= 3600) {
      interval = 3.0;
    } else if (dur <= 7200) {
      interval = 4.0;
    } else {
      interval = 5.0;
    }

    const gridDim = 19;
    const capacityPerSheet = gridDim * gridDim; // 361 tiles per sheet
    const tileW = 240;
    const tileH = 135;

    // Thread calculation logic
    const getOptimalThreadCount = (mins: number): number => {
      const cpuCount = require("os").cpus().length || 4;
      if (mins < 30) return 1;
      const needed = Math.max(2, Math.floor(mins / 30));
      const maxCap = Math.min(8, cpuCount);
      return Math.min(maxCap, needed);
    };
    const num_threads = getOptimalThreadCount(durationMins);

    const gpuSupport = await FFmpegProcessor.detectGPUSupport();
    const isHw = gpuSupport === "nvidia" && (codec === "hevc" || codec === "h264");

    logs.push(
      makeLog({
        event: "step_start",
        step: 3,
        stepName: "Sprite+VTT",
        totalUnits: num_threads,
        msg: `${durationSec}s video, ${num_threads} parallel chunks, interval=${interval}s`,
        details: {
          durationSec,
          num_threads,
          intervalSec: interval,
          gridDim,
          capacityPerSheet,
          tileW,
          tileH,
          gpuSupport,
          isHw,
        },
      }),
    );

    const chunkDuration = dur / num_threads;
    const tempTilesDir = path.join(outputDir, `tiles_${Date.now()}`);
    if (!fs.existsSync(tempTilesDir)) {
      fs.mkdirSync(tempTilesDir, { recursive: true });
    }

    const concurrencyLimit = (require("os").cpus().length || 4) * 2;
    const chunkProgress = new Array<number>(num_threads).fill(0);
    const spriteStartTime = Date.now();

    // Unified reporter: computes percentage and ETA from current chunk progress
    const reportProgress = () => {
      if (!onTileProgress) return;
      const completedWork = Math.min(dur, chunkProgress.reduce((a, b) => a + b, 0));
      const percentage = Math.min(100, (completedWork / dur) * 100);
      const elapsedSecs = (Date.now() - spriteStartTime) / 1000;
      let etaSeconds = 0;
      if (completedWork > 0 && elapsedSecs > 0) {
        const rate = completedWork / elapsedSecs;
        etaSeconds = Math.round(Math.max(0, dur - completedWork) / rate);
      }
      onTileProgress({
        percentage: Number(percentage.toFixed(2)),
        completedSecs: Math.round(completedWork),
        totalSecs: Math.round(dur),
        etaSeconds,
      });
    };

    const chunkTasks = Array.from({ length: num_threads }, (_, cIdx) => {
      return async () => {
        if (isCancelled && isCancelled()) return;

        const cStart = cIdx * chunkDuration;
        const cEnd = Math.min(dur, (cIdx + 1) * chunkDuration);
        const chunkDurationActual = Math.max(0.1, cEnd - cStart);
        const outPattern = path.join(tempTilesDir, `chunk_${cIdx}_sprite_%d.jpg`);

        const hwCodec = isHw ? `-c:v ${codec}_cuvid -resize ${tileW}x${tileH}` : "";
        const filterGraph = isHw
          ? `fps=1/${interval.toFixed(4)},tile=${gridDim}x${gridDim}`
          : `fps=1/${interval.toFixed(4)},scale=${tileW}:${tileH},tile=${gridDim}x${gridDim}`;

        const cmd = `${ffmpegCmd} -y -threads 2 ${hwCodec} -skip_frame nokey -nostdin -progress pipe:1 -ss ${cStart.toFixed(2)} -t ${chunkDurationActual.toFixed(2)} -i "${inputVideo}" -vf "${filterGraph}" -q:v 3 "${outPattern}"`;

        const chunkT0 = Date.now();
        logs.push(
          makeLog({
            event: "unit_start",
            step: 3,
            stepName: "Sprite+VTT",
            unitIndex: cIdx + 1,
            totalUnits: num_threads,
            unitName: `chunk_${cIdx + 1}`,
            msg: `${cStart.toFixed(1)}s–${cEnd.toFixed(1)}s`,
            details: { cStart, cEnd, chunkDurationActual, filterGraph, isHw },
          }),
        );

        await GLOBAL_FFMPEG_SEMAPHORE.acquire();
        try {
          if (isCancelled && isCancelled()) return;
          const child = exec(cmd, EXEC_OPTIONS);
          if (videoId && child) {
            registerChildProcess(videoId, child);
          }

          logs.push(
            makeLog({
              level: "debug",
              event: "cmd_exec",
              step: 3,
              stepName: "Sprite+VTT",
              unitIndex: cIdx + 1,
              totalUnits: num_threads,
              unitName: `chunk_${cIdx + 1}`,
              msg: `Executing sprite sheet chunk rendering command`,
              details: { cmd, pid: child.pid },
            }),
          );

          if (child.stderr && onTileProgress) {
            child.stderr.on("data", (data: any) => {
              const match = data.toString().match(/frame=\s*(\d+)/);
              if (match) {
                const inputFrame = parseInt(match[1]);
                const inputSecsProcessed = inputFrame * interval;
                chunkProgress[cIdx] = Math.min(chunkDurationActual, inputSecsProcessed);
                reportProgress();
              }
            });
          }

          await new Promise<void>((resolve) => {
            child.on("close", () => {
              chunkProgress[cIdx] = chunkDurationActual;
              reportProgress();

              let chunkFilesCount = 0;
              try {
                if (fs.existsSync(tempTilesDir)) {
                  chunkFilesCount = fs
                    .readdirSync(tempTilesDir)
                    .filter((f) => f.startsWith(`chunk_${cIdx}_sprite_`)).length;
                }
              } catch (e) {}

              logs.push(
                makeLog({
                  event: "unit_end",
                  step: 3,
                  stepName: "Sprite+VTT",
                  unitIndex: cIdx + 1,
                  totalUnits: num_threads,
                  unitName: `chunk_${cIdx + 1}`,
                  durationMs: Date.now() - chunkT0,
                  details: { chunkFilesCount },
                }),
              );
              resolve();
            });
          });
        } finally {
          GLOBAL_FFMPEG_SEMAPHORE.release();
        }
      };
    });

    await FFmpegProcessor.runWithConcurrencyLimit(chunkTasks, concurrencyLimit);

    if (isCancelled && isCancelled()) {
      logs.push(
        makeLog({
          level: "warn",
          event: "warn",
          step: 3,
          stepName: "Sprite+VTT",
          msg: `Sprite sheet generation cancelled by user`,
        }),
      );
      return { vttPath, spritePaths: [], logs };
    }

    const vttLines: string[] = ["WEBVTT\n\n"];
    let globalSheetCounter = 0;
    let cueCounter = 0;
    const spritePaths: string[] = [];

    for (let cIdx = 0; cIdx < num_threads; cIdx++) {
      const cStart = cIdx * chunkDuration;
      const cEnd = Math.min(dur, (cIdx + 1) * chunkDuration);

      const files = fs.readdirSync(tempTilesDir);
      const chunkSprites = files
        .filter((f) => f.startsWith(`chunk_${cIdx}_sprite_`) && f.endsWith(".jpg"))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/g)?.[1] || "0");
          const numB = parseInt(b.match(/\d+/g)?.[1] || "0");
          return numA - numB;
        });

      if (chunkSprites.length === 0) continue;

      const chunkDurationActual = Math.max(0.1, cEnd - cStart);
      const chunkFrameCount = Math.ceil(chunkDurationActual / interval);

      for (let sIdx = 1; sIdx <= chunkSprites.length; sIdx++) {
        globalSheetCounter++;
        const rawFile = path.join(tempTilesDir, chunkSprites[sIdx - 1]);
        const targetName = path.join(outputDir, `sprite_${globalSheetCounter}.jpg`);
        fs.renameSync(rawFile, targetName);
        spritePaths.push(targetName);

        const startTileInChunk = (sIdx - 1) * capacityPerSheet;
        const tilesInThisSheet = Math.min(
          capacityPerSheet,
          Math.max(1, chunkFrameCount - startTileInChunk),
        );

        for (let tileIdx = 0; tileIdx < tilesInThisSheet; tileIdx++) {
          const frameStartSec = cStart + (startTileInChunk + tileIdx) * interval;
          if (frameStartSec >= dur) break;
          const frameEndSec = Math.min(dur, frameStartSec + interval);

          const row = Math.floor(tileIdx / gridDim);
          const col = tileIdx % gridDim;
          const x = col * tileW;
          const y = row * tileH;

          cueCounter++;
          const sStr = formatVttTimestamp(frameStartSec);
          const eStr = formatVttTimestamp(frameEndSec);
          vttLines.push(
            `${cueCounter}\n${sStr} --> ${eStr}\nadaumc://${videoId}/sprite_${globalSheetCounter}#xywh=${x},${y},${tileW},${tileH}\n\n`,
          );
        }
      }
    }

    // Cleanup temp tiles dir
    try {
      fs.rmSync(tempTilesDir, { recursive: true, force: true });
    } catch (e) {}

    // Fallback if no sheets were generated
    if (globalSheetCounter === 0) {
      logs.push(
        makeLog({
          level: "warn",
          event: "warn",
          step: 3,
          stepName: "Sprite+VTT",
          msg: `No sprite sheets rendered. Using fallback single frame sprite sheet`,
        }),
      );
      const spritePath1 = path.join(outputDir, "sprite_1.jpg");
      if (!fs.existsSync(spritePath1)) {
        const fallbackCmd = `${ffmpegCmd} -y -nostdin -ss 1 -i "${inputVideo}" -vframes 1 -vf "scale=${tileW * gridDim}:${tileH * gridDim}" "${spritePath1}"`;
        await GLOBAL_FFMPEG_SEMAPHORE.acquire();
        try {
          await new Promise((resolve) => {
            const child = exec(fallbackCmd, EXEC_OPTIONS, () => resolve(null));
            if (videoId && child) {
              registerChildProcess(videoId, child);
            }
          });
        } finally {
          GLOBAL_FFMPEG_SEMAPHORE.release();
        }
      }
      spritePaths.push(spritePath1);

      const sStr = formatVttTimestamp(0);
      const eStr = formatVttTimestamp(Math.min(dur, interval));
      vttLines.push(
        `1\n${sStr} --> ${eStr}\nadaumc://${videoId}/sprite_1#xywh=0,0,${tileW},${tileH}\n\n`,
      );
    }

    fs.writeFileSync(vttPath, vttLines.join(""), "utf-8");
    let vttSizeBytes = 0;
    try {
      if (fs.existsSync(vttPath)) {
        vttSizeBytes = fs.statSync(vttPath).size;
      }
    } catch (e) {}

    logs.push(
      makeLog({
        event: "step_end",
        step: 3,
        stepName: "Sprite+VTT",
        durationMs: Date.now() - stepT0,
        details: {
          globalSheetCounter,
          cueCounter,
          vttSizeBytes,
          spritePathsCount: spritePaths.length,
        },
      }),
    );

    return {
      vttPath,
      spritePaths,
      logs,
    };
  }
}