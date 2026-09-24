import React from "react";
import { Info, X } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { VideoRecord } from "../env";
import { TagDropdown } from "./TagDropdown";
import {
  MediaDetailsPreview,
  MediaDetailsMetadata,
  MediaDetailsActions,
} from "./details-panel";

interface MediaDetailsPanelProps {
  selectedVideoId: string;
  onInspectBundle: (video: VideoRecord) => void;
}

export const MediaDetailsPanel: React.FC<MediaDetailsPanelProps> = ({
  selectedVideoId,
  onInspectBundle,
}) => {
  const {
    videos,
    updateVideoTags,
    setPlayingVideo,
    deleteVideo,
    setSelectedVideoId,
  } = useVideoStore();

  const selectedVideo = videos.find((v) => v.id === selectedVideoId);
  if (!selectedVideo) return null;

  return (
    <>
      {/* Mobile/Tablet Backdrop for slide-over mode */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs xl:hidden animate-fade-in"
        onClick={() => setSelectedVideoId(null)}
      />

      <div
        data-details-panel
        className="glass-surface fixed inset-y-0 right-0 z-50 flex h-full w-80 max-w-[85vw] shrink-0 flex-col overflow-hidden border-l border-white/20 dark:border-white/10 transition-all duration-300 shadow-2xl xl:relative xl:z-auto xl:inset-auto xl:max-w-none animate-in slide-in-from-right duration-200"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="border-border/60 flex items-center justify-between border-b p-4">
            <h3 className="text-foreground flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
              <Info className="text-primary-text h-4 w-4" />
              Media Details
            </h3>
            <button
              onClick={() => setSelectedVideoId(null)}
              className="text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-lg p-1 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable details content */}
          <div className="flex-1 space-y-3 overflow-y-auto p-2">
            {/* Visual Preview Frame */}
            <MediaDetailsPreview
              video={selectedVideo}
              onPlay={() => setPlayingVideo(selectedVideo)}
            />

            {/* Title & Info */}
            <div>
              <h4 className="text-foreground line-clamp-2 text-sm font-bold">
                {selectedVideo.title}
              </h4>
              <span className="text-muted mt-1 block font-mono text-[10px] select-all">
                ID: {selectedVideo.id}
              </span>
            </div>

            {/* Tag Editor Section */}
            <div className="glass-card flex flex-col gap-1.5 rounded-xl p-3">
              <span className="text-muted flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
                Video Tags
              </span>
              <TagDropdown
                selectedTags={selectedVideo.tags || []}
                onChange={(newTags) => updateVideoTags(selectedVideo.id, newTags)}
                placeholder="Add tags to video..."
                mode="editor"
              />
            </div>

            {/* Metadata Grid */}
            <MediaDetailsMetadata video={selectedVideo} />

            {/* Actions */}
            <MediaDetailsActions
              video={selectedVideo}
              onPlay={() => setPlayingVideo(selectedVideo)}
              onInspectBundle={onInspectBundle}
              onDelete={(id, title) => {
                if (confirm(`Are you sure you want to delete ${title}?`)) {
                  deleteVideo(id);
                }
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
