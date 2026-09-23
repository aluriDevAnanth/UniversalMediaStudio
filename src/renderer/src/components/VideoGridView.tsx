import React, { useEffect, useRef, useMemo } from "react";
import { useVideoStore } from "../store/videoStore";
import { VideoCard } from "./VideoCard";
import { BulkTaggingToolbar } from "./BulkTaggingToolbar";
import { VideoRecord } from "../env";
import { sortVideosByRelevance } from "../utils/relevanceScoring";
import {
  useVirtualGrid,
  CARD_HEIGHT,
  GAP,
  GridEmptyState,
  ActiveImportCard,
  ScrollIndicatorPill,
} from "./grid/index";

export const VideoGridView: React.FC = () => {
  const {
    videos,
    playlists,
    sortBy,
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
  const filteredVideos: VideoRecord[] = useMemo(() => {
    return videos.filter((v) => {
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
  }, [videos, searchQuery, selectedTags, tagMatchMode]);

  // Sort filtered videos according to selected sorting option
  const sortedVideos: VideoRecord[] = useMemo(() => {
    switch (sortBy) {
      case "relevant":
        return sortVideosByRelevance(filteredVideos, {
          playlists,
          searchQuery,
          selectedTags,
          allVideos: videos,
        });
      case "newest":
        return [...filteredVideos].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      case "oldest":
        return [...filteredVideos].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      case "title":
        return [...filteredVideos].sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }),
        );
      case "duration":
        return [...filteredVideos].sort((a, b) => (b.duration || 0) - (a.duration || 0));
      case "playCount":
        return [...filteredVideos].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      default:
        return filteredVideos;
    }
  }, [filteredVideos, sortBy, playlists]);

  // Reset scroll to top when filters or sort changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [searchQuery, selectedTags, sortBy]);

  const { visibleRange, paddingTop, paddingBottom, columnCount } =
    useVirtualGrid(scrollRef, sortedVideos.length);

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
      if (sortedVideos.length === 0) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAllVideos(sortedVideos.map((v) => v.id));
        return;
      }

      if (e.key === "Enter") {
        if (selectedVideoId) {
          const vid = sortedVideos.find((v) => v.id === selectedVideoId);
          if (vid) {
            e.preventDefault();
            setPlayingVideo(vid);
            return;
          }
        }
      }

      if (e.key === " ") {
        if (selectedVideoId) {
          e.preventDefault();
          toggleVideoSelection(selectedVideoId);
          return;
        }
      }

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
          const vid = sortedVideos.find((v) => v.id === selectedVideoId);
          if (vid) {
            e.preventDefault();
            if (confirm(`Are you sure you want to delete "${vid.title}"?`)) {
              deleteVideo(vid.id);
            }
            return;
          }
        }
      }

      if (!isCtrl && e.key.toLowerCase() === "i") {
        if (selectedVideoId) {
          e.preventDefault();
          setSelectedVideoId(null);
        } else if (sortedVideos.length > 0) {
          e.preventDefault();
          setSelectedVideoId(sortedVideos[0].id);
        }
        return;
      }

      if (!isCtrl && e.key.toLowerCase() === "b") {
        if (selectedVideoId) {
          const vid = sortedVideos.find((v) => v.id === selectedVideoId);
          if (vid) {
            e.preventDefault();
            window.dispatchEvent(
              new CustomEvent("inspect-video-bundle", { detail: vid }),
            );
          }
        }
        return;
      }

      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        e.preventDefault();
        const currentIndex = sortedVideos.findIndex(
          (v) => v.id === selectedVideoId,
        );

        let nextIndex = 0;
        if (currentIndex === -1) {
          nextIndex = 0;
        } else if (e.key === "ArrowRight") {
          nextIndex = Math.min(sortedVideos.length - 1, currentIndex + 1);
        } else if (e.key === "ArrowLeft") {
          nextIndex = Math.max(0, currentIndex - 1);
        } else if (e.key === "ArrowDown") {
          nextIndex = Math.min(
            sortedVideos.length - 1,
            currentIndex + columnCount,
          );
        } else if (e.key === "ArrowUp") {
          nextIndex = Math.max(0, currentIndex - columnCount);
        }

        const nextVideo = sortedVideos[nextIndex];
        if (nextVideo) {
          setSelectedVideoId(nextVideo.id);

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
    sortedVideos,
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

  const visibleVideos = sortedVideos.slice(
    visibleRange.start,
    visibleRange.end,
  );

  const activeImportsList = useMemo(() => {
    return (Object.values(activeImports) as any[]).filter((task) => {
      if (!task || task.percent >= 100) return false;
      const alreadyInVideos = videos.some(
        (v) =>
          v.id === task.taskId ||
          (v.title && task.fileName && v.title.toLowerCase() === task.fileName.toLowerCase()),
      );
      return !alreadyInVideos;
    });
  }, [activeImports, videos]);

  const totalItems = sortedVideos.length;
  const showingEnd = Math.min(visibleRange.end, totalItems);
  const showingStart = totalItems === 0 ? 0 : visibleRange.start + 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Scroll Container */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-2">
        {sortedVideos.length === 0 && activeImportsList.length === 0 ? (
          <GridEmptyState
            hasFilter={Boolean(searchQuery || selectedTags.length > 0)}
            onImport={() => importVideoFile()}
          />
        ) : (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            }}
          >
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

            {paddingTop === 0 &&
              activeImportsList.map((importTask: any) => (
                <ActiveImportCard
                  key={importTask.taskId}
                  importTask={importTask}
                  onCancel={cancelImport}
                />
              ))}

            {visibleVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}

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

      {/* Floating Scroll Indicator Pill */}
      <ScrollIndicatorPill
        totalItems={totalItems}
        showingStart={showingStart}
        showingEnd={showingEnd}
      />

      {/* Floating Bulk Actions Toolbar */}
      <BulkTaggingToolbar />
    </div>
  );
};
