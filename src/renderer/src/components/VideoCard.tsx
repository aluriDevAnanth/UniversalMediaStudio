import React, { useState } from "react";
import { Play, Clock, Star, Trash2, Sparkles, Check } from "lucide-react";
import { VideoRecord } from "../env";
import { useVideoStore } from "../store/videoStore";
import { BundleExplorerModal } from "./BundleExplorerModal";
import { VideoContextMenu } from "./VideoContextMenu";
import {
  parseTag,
  getCategoryColor,
  getTagStyle,
  HighlightText,
} from "../utils/tagColors";

interface VideoCardProps {
  video: VideoRecord;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const {
    setPlayingVideo,
    playlists,
    togglePlaylistVideo,
    deleteVideo,
    selectedVideoId,
    setSelectedVideoId,
    selectedVideoIds,
    toggleVideoSelection,
    categoryColors,
    searchQuery,
  } = useVideoStore();

  const watchLaterPl = playlists.find((p) => p.id === "watch_later");
  const favouritePl = playlists.find((p) => p.id === "favourite");

  const isInWatchLater = watchLaterPl?.videoIds.includes(video.id);
  const isInFavourite = favouritePl?.videoIds.includes(video.id);

  const isSelected = selectedVideoId === video.id;
  const isMultiSelected = selectedVideoIds.includes(video.id);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Custom protocol asset URLs
  const staticThumbUrl = `adaumc://${video.id}/thumbnail`;
  const animatedGifUrl = `adaumc://${video.id}/gif`;

  return (
    <>
      <div
        data-video-card
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          if (
            (e.target as HTMLElement).closest("button") ||
            (e.target as HTMLElement).closest("a")
          ) {
            return;
          }
          if (e.shiftKey || selectedVideoIds.length > 0) {
            toggleVideoSelection(video.id);
          } else {
            setSelectedVideoId(isSelected ? null : video.id);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        className={`hover:shadow-primary/10 group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-surface shadow-md transition-all duration-300 ${
          isMultiSelected
            ? "ring-primary/40 border-primary bg-primary/5 ring-2"
            : isSelected
              ? "ring-primary/30 border-primary ring-2"
              : "hover:border-primary/50 border-border"
        }`}
      >
        <div className="relative aspect-video overflow-hidden bg-black/60">
          <img
            src={isHovered ? animatedGifUrl : staticThumbUrl}
            alt={video.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              // Fallback if animated gif is missing
              if (isHovered) {
                (e.target as HTMLImageElement).src = staticThumbUrl;
              }
            }}
          />

          {/* Selection Checkbox overlay */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleVideoSelection(video.id);
            }}
            className={`absolute left-2 top-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border transition ${
              isMultiSelected
                ? "border-primary bg-primary text-white shadow-md"
                : "border-white/30 bg-black/50 text-transparent opacity-0 group-hover:opacity-100"
            }`}
            title={isMultiSelected ? "Deselect video" : "Select video for bulk actions"}
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </div>

          {/* Hover Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPlayingVideo(video);
              }}
              className="bg-primary/90 cursor-pointer rounded-full border border-white/20 bg-primary p-3.5 text-white opacity-0 shadow-lg transition-opacity hover:scale-110 group-hover:opacity-100"
              title="Play Video"
            >
              <Play className="size-6 fill-current" />
            </button>
          </div>

          {/* Badges Overlay */}
          <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1">
            <span className="rounded border border-white/10 bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
              {formatDuration(video.duration)}
            </span>
            <span className="rounded border border-white/10 bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
              {video.resolution || "HD"}
            </span>
          </div>
        </div>

        {/* Card Content Footer */}
        <div className="flex flex-1 flex-col justify-between bg-surface px-2 py-1">
          <div>
            <div
              className="line-clamp-1 text-xs font-bold text-foreground transition group-hover:text-primary-text"
              title={video.title}
            >
              <HighlightText text={video.title} query={searchQuery} />
            </div>

            {/* Tag Pills */}
            <div className="mt-1 flex flex-wrap items-center gap-1 overflow-hidden">
              {video.tags.length === 0 ? (
                <span className="text-[10px] text-muted">No Tags</span>
              ) : (
                video.tags.slice(0, 3).map((t) => {
                  const { category, name } = parseTag(t);
                  const color = getCategoryColor(category, categoryColors);
                  const style = getTagStyle(color);
                  const tagText = `${category}:${name}`;
                  return (
                    <span
                      key={t}
                      style={style}
                      className="rounded border px-1.5 py-0.2 text-[9px] font-semibold"
                    >
                      <HighlightText text={tagText} query={searchQuery} />
                    </span>
                  );
                })
              )}
              {video.tags.length > 3 && (
                <span className="text-[9px] font-bold text-muted">
                  +{video.tags.length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Card Actions */}
          <div className="mt-1.5 flex items-center gap-1">
            <div
              onClick={(e) => {
                e.stopPropagation();
                togglePlaylistVideo("watch_later", video.id);
              }}
              className={`cursor-pointer rounded-lg p-1.5 transition ${
                isInWatchLater
                  ? "bg-primary/20 text-primary-text"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
              title={
                isInWatchLater
                  ? "Remove from Watch Later"
                  : "Add to Watch Later"
              }
            >
              <Clock className="size-3" />
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                togglePlaylistVideo("favourite", video.id);
              }}
              className={`cursor-pointer rounded-lg p-1.5 transition ${
                isInFavourite
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
              title={
                isInFavourite ? "Remove from Favorites" : "Add to Favorites"
              }
            >
              <Star
                className={`size-3 ${isInFavourite ? "fill-current" : ""}`}
              />
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowExplorer(true);
              }}
              className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
              title="Inspect .adaumc Container Assets"
            >
              <Sparkles className="size-3" />
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                if (
                  confirm(`Are you sure you want to delete "${video.title}"?`)
                ) {
                  deleteVideo(video.id);
                }
              }}
              className="ml-auto cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-red-500/20 hover:text-red-400"
              title="Delete Video"
            >
              <Trash2 className="size-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Bundle Explorer Modal */}
      {showExplorer && (
        <BundleExplorerModal
          video={video}
          onClose={() => setShowExplorer(false)}
        />
      )}

      {/* Video Context Menu */}
      {contextMenu && (
        <VideoContextMenu
          video={video}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onInspectBundle={() => setShowExplorer(true)}
        />
      )}
    </>
  );
};
