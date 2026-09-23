import React, { useState } from "react";
import { VideoRecord } from "../env";
import { useVideoStore } from "../store/videoStore";
import { BundleExplorerModal } from "./BundleExplorerModal";
import { VideoContextMenu } from "./VideoContextMenu";
import { HighlightText } from "../utils/tagColors";
import { VideoCardThumbnail, VideoCardTags, VideoCardActions } from "./video-card";

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
    searchQuery,
  } = useVideoStore();

  const watchLaterPl = playlists.find((p) => p.id === "watch_later");
  const favouritePl = playlists.find((p) => p.id === "favourite");

  const isInWatchLater = watchLaterPl?.videoIds.includes(video.id);
  const isInFavourite = favouritePl?.videoIds.includes(video.id);

  const isSelected = selectedVideoId === video.id;
  const isMultiSelected = selectedVideoIds.includes(video.id);

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
        className={`glass-card group relative flex cursor-pointer flex-col overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
          isMultiSelected
            ? "ring-primary/50 border-primary ring-2 shadow-lg"
            : isSelected
              ? "ring-primary/40 border-primary ring-2 shadow-md"
              : "hover:border-primary/50"
        }`}
      >
        <VideoCardThumbnail
          video={video}
          isHovered={isHovered}
          isMultiSelected={isMultiSelected}
          onSelectToggle={(e) => {
            e.stopPropagation();
            toggleVideoSelection(video.id);
          }}
          onPlay={(e) => {
            e.stopPropagation();
            setPlayingVideo(video);
          }}
        />

        {/* Card Content Footer */}
        <div className="flex flex-1 flex-col justify-between bg-surface/50 backdrop-blur-md px-2 py-1">
          <div>
            <div
              className="line-clamp-1 text-xs font-bold text-foreground transition group-hover:text-primary-text"
              title={video.title}
            >
              <HighlightText text={video.title} query={searchQuery} />
            </div>

            {/* Tag Pills */}
            <VideoCardTags tags={video.tags} searchQuery={searchQuery} />
          </div>

          {/* Card Actions */}
          <VideoCardActions
            isInWatchLater={isInWatchLater}
            isInFavourite={isInFavourite}
            onToggleWatchLater={(e) => {
              e.stopPropagation();
              togglePlaylistVideo("watch_later", video.id);
            }}
            onToggleFavourite={(e) => {
              e.stopPropagation();
              togglePlaylistVideo("favourite", video.id);
            }}
            onInspectBundle={(e) => {
              e.stopPropagation();
              setShowExplorer(true);
            }}
            onDelete={(e) => {
              e.stopPropagation();
              if (
                confirm(`Are you sure you want to delete "${video.title}"?`)
              ) {
                deleteVideo(video.id);
              }
            }}
          />
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
