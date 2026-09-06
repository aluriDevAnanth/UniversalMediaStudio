import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Terminal,
  Tag as TagIcon,
  Plus,
  Trash2,
  MessageSquare,
  Keyboard,
} from "lucide-react";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  MediaPlayerInstance,
  useCaptionOptions,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { VideoRecord } from "../env";
import { useVideoStore } from "../store/videoStore";
import { TagDropdown } from "./TagDropdown";
import { showToast } from "./ToastNotification";
import { BufferHealthMonitor, BufferHealthStats } from "../utils/bufferMonitor";

interface VideoPlayerModalProps {
  video: VideoRecord;
  onClose: () => void;
}

const CustomCaptionsMenuContent: React.FC<{
  subtitles: Array<{ key: string; label: string; lang: string }>;
  onAddSubtitle: () => void;
  onRemoveSubtitle: (key: string) => void;
}> = ({ subtitles, onAddSubtitle, onRemoveSubtitle }) => {
  const options = useCaptionOptions();

  return (
    <div className="relative flex w-full flex-col">
      {/* Upload button positioned cleanly in top-right of submenu header with high z-index */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddSubtitle();
        }}
        title="Upload Subtitle Track"
        className="bg-primary/30 hover:bg-primary/60 border-primary-border/40 absolute -top-9 right-1 z-50 flex cursor-pointer items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold text-white shadow-md transition"
      >
        <Plus className="h-3 w-3" />
        <span>Upload</span>
      </button>

      {/* Custom Subtitle Options List */}
      <div className="flex flex-col gap-0.5 py-1">
        {options.map((option) => {
          const matchedSub = subtitles.find(
            (s) =>
              s.label === option.label ||
              (option.track?.src && option.track.src.includes(s.key)),
          );

          return (
            <div
              key={option.value}
              onClick={() => option.select()}
              className={`flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-xs transition ${
                option.selected
                  ? "bg-white/15 font-semibold text-white"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <div className="flex max-w-[170px] items-center gap-2 truncate">
                <span className="text-primary-text w-3.5 text-center text-xs font-bold">
                  {option.selected ? "✓" : ""}
                </span>
                <span className="truncate">{option.label}</span>
              </div>

              {matchedSub && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveSubtitle(matchedSub.key);
                  }}
                  title="Remove subtitle track"
                  className="ml-2 cursor-pointer rounded p-1 text-white/40 transition hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  onClose,
}) => {
  const [showLogs, setShowLogs] = useState(false);
  const [isPlayerDragHovered, setIsPlayerDragHovered] = useState(false);
  const { videos, updateVideoTags, setShortcutsOpen } = useVideoStore();
  const playerRef = useRef<MediaPlayerInstance>(null);
  const bufferMonitorRef = useRef<BufferHealthMonitor>(new BufferHealthMonitor());
  const [bufferStats, setBufferStats] = useState<BufferHealthStats>({
    bufferAheadSec: 0,
    bufferPercent: 0,
    health: "good",
    estimatedMbps: 20,
    stalls: 0,
    totalStallDurationMs: 0,
  });

  const currentVideo = videos.find((v) => v.id === video.id) || video;

  const [parsedLogs, setParsedLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [subtitles, setSubtitles] = useState<
    Array<{ key: string; label: string; lang: string }>
  >([]);

  const handleSeekPrefetch = (targetTimeSec: number) => {
    if (!currentVideo.duration || currentVideo.duration <= 0) return;
    const fraction = Math.max(0, Math.min(1, targetTimeSec / currentVideo.duration));
    const estTotalSize = ((currentVideo as any).sizeBytes || (currentVideo as any).size || 100 * 1024 * 1024);
    const estStartByte = Math.floor(fraction * estTotalSize);
    const estEndByte = Math.min(estTotalSize - 1, estStartByte + 8 * 1024 * 1024);

    fetch(`adaumc://${currentVideo.id}/video`, {
      headers: { Range: `bytes=${estStartByte}-${estEndByte}` },
    }).catch(() => {});
  };

  // Attach Buffer Monitor & Pre-warm Stream Cache
  useEffect(() => {
    const videoStreamUrl = `adaumc://${currentVideo.id}/video`;
    // Pre-warm the initial byte range & decoder headers in Chromium media cache
    fetch(videoStreamUrl, {
      headers: { Range: "bytes=0-2097151" }, // Fetch first 2MB
    }).catch(() => {});

    fetch(videoStreamUrl, {
      headers: { Range: "bytes=0-4096" }, // Pre-connect warmup
    }).catch(() => {});

    const interval = setInterval(() => {
      setBufferStats(bufferMonitorRef.current.getStats());
    }, 1000);

    return () => {
      clearInterval(interval);
      bufferMonitorRef.current.detach();
    };
  }, [currentVideo.id]);

  const loadSubtitles = () => {
    if (currentVideo.bundlePath) {
      window.api.bundle.inspect(currentVideo.bundlePath).then((res) => {
        if (res && res.metadata && res.metadata.assets) {
          const subs: Array<{ key: string; label: string; lang: string }> = [];
          Object.entries(res.metadata.assets).forEach(
            ([key, asset]: [string, any]) => {
              if (
                key.startsWith("sub_") ||
                key.startsWith("subtitle_") ||
                asset.mimeType === "text/vtt"
              ) {
                subs.push({
                  key,
                  label: asset.label || asset.filename || key,
                  lang: asset.lang || "en",
                });
              }
            },
          );
          setSubtitles(subs);
        }
      });
    }
  };

  useEffect(() => {
    loadSubtitles();
  }, [currentVideo.bundlePath]);

  const handleAddSubtitle = async (customFilePath?: string) => {
    if (!currentVideo.bundlePath) return;
    const res = await window.api.bundle.addSubtitle(
      currentVideo.bundlePath,
      customFilePath,
    );
    if (res && !("error" in res)) {
      showToast(
        "Subtitle Uploaded",
        "Subtitle track uploaded and attached to player successfully!",
        "success",
      );
      loadSubtitles();
    } else if (res && res.error) {
      showToast("Upload Failed", res.error, "error");
    }
  };

  const handleRemoveSubtitle = async (key: string) => {
    if (!currentVideo.bundlePath) return;
    const res = await window.api.bundle.removeSubtitle(
      currentVideo.bundlePath,
      key,
    );
    if (res && !("error" in res)) {
      showToast(
        "Subtitle Removed",
        "Subtitle track removed successfully!",
        "info",
      );
      loadSubtitles();
    }
  };

  const handlePlayerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!isPlayerDragHovered) {
      setIsPlayerDragHovered(true);
    }
  };

  const handlePlayerDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPlayerDragHovered(false);
  };

  const handlePlayerDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPlayerDragHovered(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext && ["vtt", "srt", "ass", "sub"].includes(ext)) {
        const filePath =
          window.api?.webUtils?.getPathForFile?.(file) ||
          (file as any).path ||
          "";
        if (filePath) {
          await handleAddSubtitle(filePath);
        }
      }
    }
  };

  // Keyboard Shortcuts for Video Player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isInput) return;

      const player = playerRef.current;
      if (!player) return;

      const key = e.key.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (showLogs) {
          setShowLogs(false);
          return;
        }
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
          return;
        }
        onClose();
        return;
      }

      if (e.key === " " || key === "k") {
        e.preventDefault();
        if (player.paused) {
          player.play();
        } else {
          player.pause();
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        player.currentTime = Math.max(0, player.currentTime - 5);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        player.currentTime = Math.min(player.duration || 999999, player.currentTime + 5);
        return;
      }

      if (key === "j") {
        e.preventDefault();
        player.currentTime = Math.max(0, player.currentTime - 10);
        return;
      }

      if (key === "l" && !isCtrl) {
        e.preventDefault();
        player.currentTime = Math.min(player.duration || 999999, player.currentTime + 10);
        return;
      }

      if (e.key === "," || e.key === "<") {
        e.preventDefault();
        if (e.shiftKey || e.key === "<") {
          player.playbackRate = Math.max(0.25, Number((player.playbackRate - 0.25).toFixed(2)));
          showToast("Playback Speed", `${player.playbackRate}x`, "info");
        } else if (player.paused) {
          player.currentTime = Math.max(0, player.currentTime - 1 / 30);
        }
        return;
      }

      if (e.key === "." || e.key === ">") {
        e.preventDefault();
        if (e.shiftKey || e.key === ">") {
          player.playbackRate = Math.min(2.0, Number((player.playbackRate + 0.25).toFixed(2)));
          showToast("Playback Speed", `${player.playbackRate}x`, "info");
        } else if (player.paused) {
          player.currentTime = Math.min(player.duration || 999999, player.currentTime + 1 / 30);
        }
        return;
      }

      if (e.key === "[") {
        e.preventDefault();
        player.playbackRate = Math.max(0.25, Number((player.playbackRate - 0.25).toFixed(2)));
        showToast("Playback Speed", `${player.playbackRate}x`, "info");
        return;
      }

      if (e.key === "]") {
        e.preventDefault();
        player.playbackRate = Math.min(2.0, Number((player.playbackRate + 0.25).toFixed(2)));
        showToast("Playback Speed", `${player.playbackRate}x`, "info");
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        player.volume = Math.min(1, Number((player.volume + 0.05).toFixed(2)));
        player.muted = false;
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        player.volume = Math.max(0, Number((player.volume - 0.05).toFixed(2)));
        return;
      }

      if (key === "m") {
        e.preventDefault();
        player.muted = !player.muted;
        return;
      }

      if (key === "f") {
        e.preventDefault();
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        } else {
          if (player.enterFullscreen) {
            player.enterFullscreen();
          }
        }
        return;
      }

      if (key === "c") {
        e.preventDefault();
        const textTracks = player.textTracks;
        if (textTracks && textTracks.length > 0) {
          const active = Array.from(textTracks).find((t: any) => t.mode === "showing");
          if (active) {
            (active as any).mode = "disabled";
            showToast("Subtitles", "Disabled", "info");
          } else {
            const first = textTracks[0];
            if (first) {
              (first as any).mode = "showing";
              showToast("Subtitles", first.label || "Enabled", "info");
            }
          }
        }
        return;
      }

      if (e.key === "0" || e.key === "Home") {
        e.preventDefault();
        player.currentTime = 0;
        return;
      }

      if (e.key === "End") {
        e.preventDefault();
        player.currentTime = player.duration || 0;
        return;
      }

      if (e.key === "`" || e.key === "~") {
        e.preventDefault();
        setShowLogs((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [showLogs, onClose]);

  useEffect(() => {
    if (showLogs && currentVideo.bundlePath) {
      setLoadingLogs(true);
      window.api.bundle
        .readAsset(currentVideo.bundlePath, "logs")
        .then((assetRes) => {
          if (assetRes && assetRes.text) {
            const rawLines = assetRes.text
              .split("\n")
              .filter((l: string) => l.trim().length > 0);
            const parsed = rawLines.map((line: string) => {
              try {
                return JSON.parse(line);
              } catch (e) {
                return {
                  t: new Date().toISOString(),
                  event: "info",
                  step: 0,
                  stepName: "Info",
                  msg: line,
                };
              }
            });
            setParsedLogs(parsed);
          } else {
            window.api.bundle.inspect(currentVideo.bundlePath!).then((res) => {
              if (res && res.metadata && res.metadata.logs) {
                const parsed = res.metadata.logs.map((line: string) => {
                  try {
                    return JSON.parse(line);
                  } catch (e) {
                    return {
                      t: new Date().toISOString(),
                      event: "info",
                      step: 0,
                      stepName: "Info",
                      msg: line,
                    };
                  }
                });
                setParsedLogs(parsed);
              } else if (res && res.error) {
                setParsedLogs([
                  {
                    t: new Date().toISOString(),
                    event: "info",
                    step: 0,
                    stepName: "Error",
                    msg: `Failed to load logs: ${res.error}`,
                  },
                ]);
              }
            });
          }
        })
        .catch(() => {
          window.api.bundle
            .inspect(currentVideo.bundlePath!)
            .then((res) => {
              if (res && res.metadata && res.metadata.logs) {
                const parsed = res.metadata.logs.map((line: string) => {
                  try {
                    return JSON.parse(line);
                  } catch (e) {
                    return {
                      t: new Date().toISOString(),
                      event: "info",
                      step: 0,
                      stepName: "Info",
                      msg: line,
                    };
                  }
                });
                setParsedLogs(parsed);
              } else if (res && res.error) {
                setParsedLogs([
                  {
                    t: new Date().toISOString(),
                    event: "info",
                    step: 0,
                    stepName: "Error",
                    msg: `Failed to load logs: ${res.error}`,
                  },
                ]);
              }
            })
            .catch((err: any) => {
              setParsedLogs([
                {
                  t: new Date().toISOString(),
                  event: "info",
                  step: 0,
                  stepName: "Error",
                  msg: `Failed to load logs: ${err.message}`,
                },
              ]);
            });
        })
        .finally(() => {
          setLoadingLogs(false);
        });
    }
  }, [showLogs, currentVideo.bundlePath]);

  const videoStreamUrl = `adaumc://${currentVideo.id}/video`;
  const vttThumbnailsUrl = `adaumc://${currentVideo.id}/vtt`;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 px-2 py-3 backdrop-blur-2xl"
    >
      <div className="bg-surface/85 border-border/80 relative flex h-full w-full max-w-[90vw] flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="border-border/70 bg-background/60 relative z-30 shrink-0 flex items-center justify-between border-b px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="bg-primary/20 text-primary-text border-primary-border/40 rounded border px-2 py-0.5 text-xs font-bold backdrop-blur-xs">
              ADAUMC Player
            </span>
            <h2 className="text-foreground max-w-xl truncate text-base font-bold">
              {currentVideo.title}
            </h2>
          </div>

          <div className="relative z-30 flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              title="Player Shortcuts (? or F1)"
              className="bg-surface hover:bg-surface-hover text-muted hover:text-foreground border-border cursor-pointer rounded-xl border p-1.5 transition pointer-events-auto"
            >
              <Keyboard className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              title="Container Telemetry Logs (~ or `)"
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition pointer-events-auto ${
                showLogs
                  ? "bg-primary border-primary-border text-white"
                  : "bg-surface hover:bg-surface-hover text-muted border-border hover:text-foreground"
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              {showLogs ? "Hide Logs" : "Bundle Logs"}
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              title="Close Player (Esc)"
              className="relative z-40 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-border/80 bg-surface hover:border-red-500/40 hover:bg-red-500/20 text-muted hover:text-red-400 transition active:scale-95 pointer-events-auto select-none"
            >
              <X className="pointer-events-none h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Video Player Container */}
        <div
          style={{ contain: "layout paint", transform: "translateZ(0)" }}
          onDragOver={handlePlayerDragOver}
          onDragLeave={handlePlayerDragLeave}
          onDrop={handlePlayerDrop}
          className="relative flex aspect-video h-[75vh] w-full items-center justify-center overflow-hidden bg-black"
        >
          {/* Player Subtitle Drag Hover Overlay */}
          {isPlayerDragHovered && (
            <div className="border-primary animate-in fade-in pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center border-4 border-dashed bg-slate-950/80 p-6 text-center text-white backdrop-blur-md duration-200">
              <div className="bg-primary/20 text-primary-text border-primary-border/40 mb-3 animate-bounce rounded-full border p-4 shadow-2xl">
                <MessageSquare className="text-primary-text h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-white">
                Drop Subtitle File to Attach to Player
              </h3>
              <p className="text-muted mt-1 max-w-sm text-xs">
                Supports .vtt, .srt, .ass, and .sub files. Will be bundled into
                .adaumc container automatically.
              </p>
            </div>
          )}

          <MediaPlayer
            ref={playerRef}
            title={currentVideo.title}
            src={videoStreamUrl}
            className="h-full w-full"
            autoPlay
            preload="auto"
            load="eager"
            playsInline
            onSeeked={(time) => {
              if (typeof time === "number") {
                handleSeekPrefetch(time);
              }
            }}
            onLoadedData={() => {
              const player = playerRef.current;
              if (player) {
                const mediaEl = (player as any).el?.querySelector("video") || (player as any).media;
                if (mediaEl) {
                  bufferMonitorRef.current.attach(mediaEl);
                }
              }
            }}
          >
            <MediaProvider>
              <Track
                src={vttThumbnailsUrl}
                kind={"thumbnails" as any}
                label="Previews"
                lang="en-US"
                default
              />
              {subtitles.length === 0 ? (
                <Track
                  src="data:text/vtt,WEBVTT"
                  kind="subtitles"
                  label="Off"
                  lang="en"
                  default
                />
              ) : (
                subtitles.map((sub, idx) => (
                  <Track
                    key={sub.key}
                    src={`adaumc://${currentVideo.id}/${sub.key}`}
                    kind="subtitles"
                    label={sub.label}
                    lang={sub.lang}
                    default={idx === 0}
                  />
                ))
              )}
            </MediaProvider>
            <DefaultVideoLayout
              icons={defaultLayoutIcons}
              thumbnails={vttThumbnailsUrl}
              slots={{
                captionsMenuItemsStart: (
                  <>
                    <style>{`
                      /* Position hint text ("Off") right next to "Captions" in submenu header */
                      .vds-captions-menu [data-part="hint"],
                      .vds-menu-items .vds-menu-button [data-part="hint"] {
                        margin-left: 0.5rem !important;
                        margin-right: auto !important;
                        opacity: 0.7;
                      }
                      /* Hide default radio group as custom options list with delete buttons is rendered */
                      .vds-captions-radio-group {
                        display: none !important;
                      }
                    `}</style>
                    <CustomCaptionsMenuContent
                      subtitles={subtitles}
                      onAddSubtitle={handleAddSubtitle}
                      onRemoveSubtitle={handleRemoveSubtitle}
                    />
                  </>
                ),
              }}
            />
          </MediaPlayer>
        </div>

        {/* Bottom Details, Subtitles & Tag Manager */}
        <div className="space-y-4 overflow-y-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-foreground text-lg font-bold">
                {currentVideo.title}
              </h3>
              <p className="text-muted mt-1 text-xs">
                Resolution: {currentVideo.resolution} • Duration:{" "}
                {Math.floor(currentVideo.duration / 60)}m{" "}
                {Math.floor(currentVideo.duration % 60)}s • Created:{" "}
                {new Date(currentVideo.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Tag Selection Dropdown */}
            <div className="flex items-center gap-2">
              <TagIcon className="text-primary-text h-4 w-4" />
              <span className="text-muted text-xs font-semibold">Tags:</span>
              <TagDropdown
                selectedTags={currentVideo.tags || []}
                onChange={(newTags) =>
                  updateVideoTags(currentVideo.id, newTags)
                }
                placeholder="Add tags..."
                mode="editor"
              />
            </div>
          </div>

          {/* Bundle Logs Panel */}
          {showLogs && (
            <div className="bg-background border-border text-primary-text mt-4 max-h-64 space-y-2 overflow-y-auto rounded-xl border p-4 font-mono text-xs">
              <div className="text-muted border-border mb-2 flex items-center justify-between border-b pb-2">
                <span className="text-foreground flex items-center gap-1.5 font-bold">
                  <Terminal className="h-4 w-4 text-amber-500" />
                  .adaumc Container Diagnostic Telemetry Logs
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-muted">
                    Buffer:{" "}
                    <strong
                      className={
                        bufferStats.health === "excellent" || bufferStats.health === "good"
                          ? "text-emerald-400"
                          : bufferStats.health === "fair"
                            ? "text-amber-400"
                            : "text-red-400"
                      }
                    >
                      {bufferStats.bufferAheadSec}s ({bufferStats.health.toUpperCase()})
                    </strong>
                  </span>
                  <span className="text-muted">
                    Bandwidth: <strong className="text-cyan-400">{bufferStats.estimatedMbps} Mbps</strong>
                  </span>
                  {bufferStats.stalls > 0 && (
                    <span className="text-red-400">
                      Stalls: <strong>{bufferStats.stalls}</strong>
                    </span>
                  )}
                  <span className="text-muted">ID: {currentVideo.id}</span>
                </div>
              </div>
              {loadingLogs ? (
                <p className="text-muted">Loading telemetry logs...</p>
              ) : parsedLogs.length === 0 ? (
                <p className="text-muted">No telemetry logs found.</p>
              ) : (
                parsedLogs.map((log: any, index: number) => {
                  const timeStr = log.t
                    ? new Date(log.t).toLocaleTimeString()
                    : "";
                  const level =
                    log.level ||
                    (log.event === "error"
                      ? "error"
                      : log.event === "warn"
                        ? "warn"
                        : "info");

                  let badgeBg =
                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  if (level === "error")
                    badgeBg = "bg-red-500/10 text-red-400 border-red-500/20";
                  else if (level === "warn")
                    badgeBg =
                      "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  else if (level === "debug")
                    badgeBg = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

                  let text = "";
                  if (log.event === "step_start") {
                    text = `▶ Step ${log.step} [${log.stepName}] started${log.msg ? ` - ${log.msg}` : ""}`;
                  } else if (log.event === "step_end") {
                    text = `⏹ Step ${log.step} [${log.stepName}] completed in ${log.durationMs || 0}ms`;
                  } else if (log.event === "unit_start") {
                    text = `↳ Starting ${log.unitName || `Unit ${log.unitIndex}`}${log.msg ? ` - ${log.msg}` : ""}`;
                  } else if (log.event === "unit_end") {
                    text = `↳ Completed ${log.unitName || `Unit ${log.unitIndex}`} in ${log.durationMs || 0}ms`;
                  } else if (log.event === "cmd_exec") {
                    text = `⚡ CLI Exec: ${log.msg || ""}`;
                  } else {
                    text = log.msg || "";
                  }

                  return (
                    <div
                      key={index}
                      className={`bg-surface/50 border-border/40 flex flex-col gap-1 rounded border p-1.5 ${
                        log.event?.startsWith("unit_") ? "pl-4" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-foreground flex flex-wrap items-center gap-2">
                          {timeStr && (
                            <span className="text-muted text-[10px]">
                              [{timeStr}]
                            </span>
                          )}
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${badgeBg}`}
                          >
                            {level}
                          </span>
                          {log.stepName && (
                            <span className="bg-border/50 text-muted rounded px-1.5 py-0.5 text-[9px]">
                              {log.stepName}
                            </span>
                          )}
                          <span>{text}</span>
                        </div>
                        {log.memoryMb && (
                          <span className="text-muted text-[10px] whitespace-nowrap">
                            {log.memoryMb}MB RAM
                          </span>
                        )}
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="text-muted mt-1 text-[11px]">
                          <summary className="cursor-pointer text-[10px] font-semibold transition select-none hover:text-amber-400">
                            View Diagnostic Details
                          </summary>
                          <pre className="bg-background border-border/60 mt-1 overflow-x-auto rounded border p-2 font-mono text-[10px] text-cyan-300">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
