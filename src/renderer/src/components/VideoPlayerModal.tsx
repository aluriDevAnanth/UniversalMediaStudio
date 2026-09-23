import React, { useState, useEffect, useRef } from "react";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  MediaPlayerInstance,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { VideoRecord } from "../env";
import { useVideoStore } from "../store/videoStore";
import { showToast } from "./ToastNotification";
import { BufferHealthMonitor, BufferHealthStats } from "../utils/bufferMonitor";
import {
  CustomCaptionsMenuContent,
  PlayerHeader,
  PlayerDropOverlay,
  PlayerTelemetryLogs,
  PlayerDetailsBar,
} from "./player/index";

interface VideoPlayerModalProps {
  video: VideoRecord;
  onClose: () => void;
}

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

  useEffect(() => {
    const videoStreamUrl = `adaumc://${currentVideo.id}/video`;
    fetch(videoStreamUrl, {
      headers: { Range: "bytes=0-2097151" },
    }).catch(() => {});

    fetch(videoStreamUrl, {
      headers: { Range: "bytes=0-4096" },
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
              } catch {
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
                  } catch {
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
                  } catch {
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
      <div className="bg-surface/85 border-border/80 relative flex h-full max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl">
        {/* Header Component */}
        <PlayerHeader
          title={currentVideo.title}
          showLogs={showLogs}
          onToggleLogs={() => setShowLogs(!showLogs)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onClose={onClose}
        />

        {/* Video Player Container */}
        <div
          style={{ contain: "layout paint", transform: "translateZ(0)" }}
          onDragOver={handlePlayerDragOver}
          onDragLeave={handlePlayerDragLeave}
          onDrop={handlePlayerDrop}
          className="relative flex flex-1 min-h-[220px] max-h-[65vh] w-full items-center justify-center overflow-hidden bg-black"
        >
          {/* Subtitle Drag Hover Overlay */}
          <PlayerDropOverlay isVisible={isPlayerDragHovered} />

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
                      .vds-captions-menu [data-part="hint"],
                      .vds-menu-items .vds-menu-button [data-part="hint"] {
                        margin-left: 0.5rem !important;
                        margin-right: auto !important;
                        opacity: 0.7;
                      }
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

        {/* Bottom Details & Tag Manager */}
        <div className="space-y-3 overflow-y-auto p-3 sm:p-5 shrink-0">
          <PlayerDetailsBar
            video={currentVideo}
            onUpdateTags={(newTags) => updateVideoTags(currentVideo.id, newTags)}
          />

          {/* Bundle Logs Panel Component */}
          <PlayerTelemetryLogs
            showLogs={showLogs}
            loadingLogs={loadingLogs}
            parsedLogs={parsedLogs}
            bufferStats={bufferStats}
            videoId={currentVideo.id}
          />
        </div>
      </div>
    </div>
  );
};
