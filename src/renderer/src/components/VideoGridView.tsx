import React, { useState, useEffect, useRef, useCallback } from "react";
import { Film, Upload, Loader2, Clock, Trash2, Sparkles } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { VideoCard } from "./VideoCard";
import { BulkTaggingToolbar } from "./BulkTaggingToolbar";
import { VideoRecord } from "../env";

// ─── Virtual Grid Hook ────────────────────────────────────────────────────────

const CARD_HEIGHT = 284; // px: aspect-video thumb (~168) + info (~90) + gap (26)
const GAP = 24; // matches gap-6 (1.5rem = 24px)
const OVERSCAN = 2; // extra rows to render above and below the visible area

function getColumnCount(width: number): number {
  if (width < 640) return 1;
  if (width < 768) return 2;
  if (width < 1024) return 3;
  return 5;
}

interface VirtualGridState {
  startRow: number;
  endRow: number;
  totalRows: number;
  columnCount: number;
  paddingTop: number;
  paddingBottom: number;
  visibleRange: { start: number; end: number }; // item indices
}

function useVirtualGrid(
  containerRef: React.RefObject<HTMLDivElement | null>,
  itemCount: number,
): VirtualGridState {
  const [state, setState] = useState<VirtualGridState>({
    startRow: 0,
    endRow: 0,
    totalRows: 0,
    columnCount: 6,
    paddingTop: 0,
    paddingBottom: 0,
    visibleRange: { start: 0, end: 0 },
  });

  const rafRef = useRef<number | null>(null);
  const colCountRef = useRef(4);

  const compute = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const cols = colCountRef.current;
    const totalRows = Math.ceil(itemCount / cols);
    const rowHeight = CARD_HEIGHT + GAP;
    const scrollTop = el.scrollTop;
    const viewHeight = el.clientHeight;

    const firstVisibleRow = Math.floor(scrollTop / rowHeight);
    const lastVisibleRow = Math.ceil((scrollTop + viewHeight) / rowHeight);

    const startRow = Math.max(0, firstVisibleRow - OVERSCAN);
    const endRow = Math.min(totalRows - 1, lastVisibleRow + OVERSCAN);

    const paddingTop = startRow * rowHeight;
    const paddingBottom = Math.max(0, (totalRows - endRow - 1) * rowHeight);

    const visibleStart = startRow * cols;
    const visibleEnd = Math.min(itemCount, (endRow + 1) * cols);

    setState({
      startRow,
      endRow,
      totalRows,
      columnCount: cols,
      paddingTop,
      paddingBottom,
      visibleRange: { start: visibleStart, end: visibleEnd },
    });
  }, [containerRef, itemCount]);

  // Throttled scroll handler via rAF
  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      compute();
      rafRef.current = null;
    });
  }, [compute]);

  // ResizeObserver for responsive column count
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      colCountRef.current = getColumnCount(width);
      compute();
    });

    ro.observe(el);
    colCountRef.current = getColumnCount(el.clientWidth);
    compute();

    return () => ro.disconnect();
  }, [containerRef, compute]);

  // Scroll listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [containerRef, handleScroll]);

  // Recompute when itemCount changes
  useEffect(() => {
    compute();
  }, [itemCount, compute]);

  return state;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VideoGridView: React.FC = () => {
  const {
    videos,
    searchQuery,
    selectedTags,
    tagMatchMode,
    importVideoFile,
    activeImports,
    cancelImport,
    selectedVideoId,
    setSelectedVideoId,
    selectedVideoIds,
    toggleVideoSelection,
    selectAllVideos,
    setPlayingVideo,
    deleteVideo,
    bulkDeleteSelectedVideos,
  } = useVideoStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter videos by search & selected tags (ANY vs ALL mode)
  const filteredVideos: VideoRecord[] = videos.filter((v) => {
    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.trim();
      if (q.startsWith("#")) {
        const clean = q.slice(1);
        if (clean.includes(":")) {
          const [catSearch, tagSearch] = clean.split(":");
          matchesSearch = v.tags.some((t) => {
            const parts = t.split(":");
            const cat = parts[0] || "General";
            const tagNm = parts.slice(1).join(":") || t;
            return (
              cat.toLowerCase().includes(catSearch.toLowerCase()) &&
              tagNm.toLowerCase().includes(tagSearch.toLowerCase())
            );
          });
        } else {
          matchesSearch = v.tags.some((t) => {
            const cat = t.split(":")[0] || "General";
            return cat.toLowerCase().includes(clean.toLowerCase());
          });
        }
      } else {
        const qLower = q.toLowerCase();
        matchesSearch =
          v.title.toLowerCase().includes(qLower) ||
          v.resolution.toLowerCase().includes(qLower) ||
          v.tags.some((t) => {
            const formatted = t.replace(":", " ").toLowerCase();
            return formatted.includes(qLower) || t.toLowerCase().includes(qLower);
          });
      }
    }

    const matchesTags =
      selectedTags.length === 0 ||
      (tagMatchMode === "ALL"
        ? selectedTags.every((tag) => v.tags.includes(tag))
        : selectedTags.some((tag) => v.tags.includes(tag)));

    return matchesSearch && matchesTags;
  });

  // Reset scroll to top when filters change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [searchQuery, selectedTags]);

  const { visibleRange, paddingTop, paddingBottom, columnCount } =
    useVirtualGrid(scrollRef, filteredVideos.length);

  // Keyboard navigation & actions for video grid
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
      if (filteredVideos.length === 0) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      // Select All: Ctrl+A
      if (isCtrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAllVideos(filteredVideos.map((v) => v.id));
        return;
      }

      // Enter: Play selected video
      if (e.key === "Enter") {
        if (selectedVideoId) {
          const vid = filteredVideos.find((v) => v.id === selectedVideoId);
          if (vid) {
            e.preventDefault();
            setPlayingVideo(vid);
            return;
          }
        }
      }

      // Space: Toggle multi-select on focused video
      if (e.key === " ") {
        if (selectedVideoId) {
          e.preventDefault();
          toggleVideoSelection(selectedVideoId);
          return;
        }
      }

      // Delete: Delete selected video or bulk delete
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedVideoIds.length > 0) {
          e.preventDefault();
          if (
            confirm(
              `Are you sure you want to delete ${selectedVideoIds.length} selected videos?`,
            )
          ) {
            bulkDeleteSelectedVideos();
          }
          return;
        } else if (selectedVideoId) {
          const vid = filteredVideos.find((v) => v.id === selectedVideoId);
          if (vid) {
            e.preventDefault();
            if (confirm(`Are you sure you want to delete "${vid.title}"?`)) {
              deleteVideo(vid.id);
            }
            return;
          }
        }
      }

      // 'I': Toggle details panel
      if (!isCtrl && e.key.toLowerCase() === "i") {
        if (selectedVideoId) {
          e.preventDefault();
          setSelectedVideoId(null);
        } else if (filteredVideos.length > 0) {
          e.preventDefault();
          setSelectedVideoId(filteredVideos[0].id);
        }
        return;
      }

      // 'B': Open bundle inspector
      if (!isCtrl && e.key.toLowerCase() === "b") {
        if (selectedVideoId) {
          const vid = filteredVideos.find((v) => v.id === selectedVideoId);
          if (vid) {
            e.preventDefault();
            window.dispatchEvent(
              new CustomEvent("inspect-video-bundle", { detail: vid }),
            );
          }
        }
        return;
      }

      // Arrow navigation
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        e.preventDefault();
        const currentIndex = filteredVideos.findIndex(
          (v) => v.id === selectedVideoId,
        );

        let nextIndex = 0;
        if (currentIndex === -1) {
          nextIndex = 0;
        } else if (e.key === "ArrowRight") {
          nextIndex = Math.min(filteredVideos.length - 1, currentIndex + 1);
        } else if (e.key === "ArrowLeft") {
          nextIndex = Math.max(0, currentIndex - 1);
        } else if (e.key === "ArrowDown") {
          nextIndex = Math.min(
            filteredVideos.length - 1,
            currentIndex + columnCount,
          );
        } else if (e.key === "ArrowUp") {
          nextIndex = Math.max(0, currentIndex - columnCount);
        }

        const nextVideo = filteredVideos[nextIndex];
        if (nextVideo) {
          setSelectedVideoId(nextVideo.id);

          // Auto-scroll into view if needed
          const rowHeight = CARD_HEIGHT + GAP;
          const targetRow = Math.floor(nextIndex / columnCount);
          const targetTop = targetRow * rowHeight;
          const targetBottom = targetTop + rowHeight;

          if (scrollRef.current) {
            const el = scrollRef.current;
            if (targetTop < el.scrollTop) {
              el.scrollTop = targetTop;
            } else if (targetBottom > el.scrollTop + el.clientHeight) {
              el.scrollTop = targetBottom - el.clientHeight;
            }
          }
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    filteredVideos,
    selectedVideoId,
    selectedVideoIds,
    columnCount,
    setSelectedVideoId,
    toggleVideoSelection,
    selectAllVideos,
    setPlayingVideo,
    deleteVideo,
    bulkDeleteSelectedVideos,
  ]);

  const visibleVideos = filteredVideos.slice(
    visibleRange.start,
    visibleRange.end,
  );
  const activeImportsList = Object.values(activeImports) as any[];

  // Indicator text
  const totalItems = filteredVideos.length;
  const showingEnd = Math.min(visibleRange.end, totalItems);
  const showingStart = totalItems === 0 ? 0 : visibleRange.start + 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Scroll Container */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredVideos.length === 0 && activeImportsList.length === 0 ? (
          /* ── Empty State ── */
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center text-muted">
            <div className="bg-primary/10 border-primary-border/20 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border text-primary-text">
              <Film className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              No .adaumc videos found
            </h3>
            <p className="mb-6 mt-1 max-w-sm text-xs text-muted">
              {searchQuery || selectedTags.length > 0
                ? "No video bundles match your active search filter."
                : "Drag & Drop any video file anywhere on the app or click below to import."}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => importVideoFile()}
                className="shadow-primary/30 flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-hover"
              >
                <Upload className="h-4 w-4" />
                Import Video / .adaumc File
              </button>
            </div>
          </div>
        ) : (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            }}
          >
            {/* ── Top spacer (above virtual window) ── */}
            {paddingTop > 0 && (
              <div
                style={{
                  gridColumn: `1 / -1`,
                  height: paddingTop,
                  pointerEvents: "none",
                  flexShrink: 0,
                }}
              />
            )}

            {/* ── Active Import Cards (always rendered, pinned at top) ── */}
            {paddingTop === 0 &&
              activeImportsList.map((importTask: any) => (
                <div
                  key={importTask.taskId}
                  className="group relative flex flex-col overflow-hidden rounded-xl bg-surface shadow-md"
                >
                  {/* Processing Thumbnail */}
                  <div className="relative flex aspect-video w-full flex-col items-center justify-center bg-background p-3">
                    <div className="bg-primary/30 mb-1.5 flex h-8 w-8 items-center justify-center rounded-full text-primary-text shadow">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <span className="max-w-full truncate px-2 text-[11px] font-bold text-foreground">
                      Processing {importTask.fileName}
                    </span>

                    {/* Progress Bar */}
                    <div className="mt-2 h-1.5 w-4/5 overflow-hidden rounded-full border border-border bg-surface p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-300"
                        style={{ width: `${importTask.percent}%` }}
                      />
                    </div>

                    {/* Step Badge */}
                    <div className="bg-primary/95 animate-fade-in absolute left-1.5 top-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow backdrop-blur">
                      <Sparkles className="h-2.5 w-2.5 animate-pulse text-amber-300" />
                      Step {importTask.step}/4{" "}
                      {importTask.workDone !== undefined &&
                      importTask.totalWork !== undefined
                        ? `(${Math.round(importTask.workDone)}/${Math.round(importTask.totalWork)})`
                        : `(${importTask.percent}%)`}
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="flex flex-1 flex-col justify-between gap-1 px-2 py-1">
                    <div>
                      <h3 className="line-clamp-1 text-xs font-semibold text-foreground">
                        {importTask.fileName}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-1.5 text-[10px] text-muted">
                      <span className="font-mono text-primary-text">
                        Step {importTask.step}/4
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-muted">
                          <Clock className="h-3 w-3 text-muted" />
                          {importTask.etaSeconds !== null
                            ? `${importTask.etaSeconds}s remaining`
                            : "Calculating ETA..."}
                        </span>
                        <button
                          onClick={() => cancelImport(importTask.taskId)}
                          title="Cancel processing and remove card"
                          className="cursor-pointer rounded p-1 text-rose-500 transition hover:bg-rose-500/20 hover:text-rose-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* ── Virtualized Video Cards ── */}
            {visibleVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}

            {/* ── Bottom spacer (below virtual window) ── */}
            {paddingBottom > 0 && (
              <div
                style={{
                  gridColumn: `1 / -1`,
                  height: paddingBottom,
                  pointerEvents: "none",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Floating Scroll Indicator Pill ── */}
      {totalItems > 0 && (
        <div className="pointer-events-none absolute bottom-4 right-4">
          <div className="bg-surface/80 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium tabular-nums text-muted shadow-lg backdrop-blur">
            <span className="font-semibold text-foreground">
              {showingStart}–{showingEnd}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">{totalItems}</span>{" "}
            videos
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Toolbar */}
      <BulkTaggingToolbar />
    </div>
  );
};
