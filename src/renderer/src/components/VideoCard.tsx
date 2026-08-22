import React, { useState } from "react";
import { Play, Clock, Star, Trash2, Sparkles } from "lucide-react";
import { VideoRecord } from "../env";
import { useVideoStore } from "../store/videoStore";
import { BundleExplorerModal } from "./BundleExplorerModal";
import { VideoContextMenu } from "./VideoContextMenu";
import { TagDropdown } from "./TagDropdown";

interface VideoCardProps {
  video: VideoRecord;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const {
    setPlayingVideo,
    playlists,
    togglePlaylistVideo,
    deleteVideo,
    selectedVideoId,
    setSelectedVideoId,
    updateVideoTags,
  } = useVideoStore();

  const watchLaterPl = playlists.find((p) => p.id === "watch_later");
  const favouritePl = playlists.find((p) => p.id === "favourite");

  const isInWatchLater = watchLaterPl?.videoIds.includes(video.id);
  const isInFavourite = favouritePl?.videoIds.includes(video.id);

  const isSelected = selectedVideoId === video.id;

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
          setSelectedVideoId(isSelected ? null : video.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        className={`group relative rounded-xl overflow-hidden bg-surface border transition-all duration-300 shadow-md hover:shadow-primary/10 flex flex-col cursor-pointer ${
          isSelected
            ? "border-primary ring-2 ring-primary/30"
            : "border-border hover:border-primary/50"
        }`}
      >
        {/* Media Thumbnail Container */}
        <div className="relative aspect-video bg-black/60 overflow-hidden">
          <img
            src={isHovered ? animatedGifUrl : staticThumbUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              // Fallback if animated gif is missing
              if (isHovered) {
                (e.target as HTMLImageElement).src = staticThumbUrl;
              }
            }}
          />

          {/* Hover Play Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPlayingVideo(video);
              }}
              className="p-3.5 rounded-full bg-primary/90 text-white hover:bg-primary hover:scale-110 transition cursor-pointer shadow-lg border border-white/20"
              title="Play Video"
            >
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            </button>
          </div>

          {/* Badges Overlay */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
            <span className="px-2 py-0.5 rounded bg-black/70 text-white/90 text-[10px] font-semibold backdrop-blur-md border border-white/10">
              {formatDuration(video.duration)}
            </span>
            <span className="px-2 py-0.5 rounded bg-black/70 text-white/90 text-[10px] font-semibold backdrop-blur-md border border-white/10">
              {video.resolution || "HD"}
            </span>
          </div>
        </div>

        {/* Card Content Footer */}
        <div className="p-3 flex flex-col flex-1 justify-between bg-surface">
          <div>
            <h3
              className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary-text transition"
              title={video.title}
            >
              {video.title}
            </h3>

            {/* Tags Component */}
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <TagDropdown
                selectedTags={video.tags || []}
                onChange={(newTags) => updateVideoTags(video.id, newTags)}
              />
            </div>
          </div>

          {/* Card Actions */}
          <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlaylistVideo("watch_later", video.id);
                }}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isInWatchLater
                    ? "bg-primary/20 text-primary-text"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
                title={isInWatchLater ? "Remove from Watch Later" : "Add to Watch Later"}
              >
                <Clock className="w-4 h-4" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlaylistVideo("favourite", video.id);
                }}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isInFavourite
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
                title={isInFavourite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Star className={`w-4 h-4 ${isInFavourite ? "fill-current" : ""}`} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExplorer(true);
                }}
                className="p-1.5 rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition cursor-pointer"
                title="Inspect .adaumc Container Assets"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${video.title}"?`)) {
                  deleteVideo(video.id);
                }
              }}
              className="p-1.5 rounded-lg text-muted hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
              title="Delete Video"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
