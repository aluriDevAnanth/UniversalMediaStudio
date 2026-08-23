import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Terminal,
  Tag as TagIcon,
  Plus,
  Trash2,
  MessageSquare,
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
  const { videos, updateVideoTags } = useVideoStore();
  const playerRef = useRef<MediaPlayerInstance>(null);

  const currentVideo = videos.find((v) => v.id === video.id) || video;

  const [parsedLogs, setParsedLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [subtitles, setSubtitles] = useState<
    Array<{ key: string; label: string; lang: string }>
  >([]);

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
        const filePath = (file as any).path;
        if (filePath) {
          await handleAddSubtitle(filePath);
        }
      }
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/90 px-2 py-3 backdrop-blur-md">
      <div className="bg-surface border-border flex h-full w-full max-w-[90vw] flex-col overflow-hidden rounded-2xl border shadow-2xl">
        {/* Header */}
        <div className="border-border bg-background/60 flex items-center justify-between border-b px-2 py-2">
          <div className="flex items-center gap-3">
            <span className="bg-primary/20 text-primary-text border-primary-border/40 rounded border px-2 py-0.5 text-xs font-bold">
              ADAUMC Player
            </span>
            <h2 className="text-foreground max-w-xl truncate text-base font-bold">
              {currentVideo.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                showLogs
                  ? "bg-primary border-primary-border text-white"
                  : "bg-surface hover:bg-surface-hover text-muted border-border hover:text-foreground"
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              {showLogs ? "Hide Logs" : "Bundle Logs"}
            </button>

            <button
              onClick={onClose}
              className="hover:bg-surface-hover text-muted hover:text-foreground cursor-pointer rounded-xl p-2 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video Player Container */}
        <div
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
                <span className="text-[11px]">ID: {currentVideo.id}</span>
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
