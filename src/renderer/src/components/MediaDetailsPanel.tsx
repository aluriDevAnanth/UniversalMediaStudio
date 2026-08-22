import { Info, X, Play, FileText, Trash2 } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { VideoRecord } from "../env";
import { TagDropdown } from "./TagDropdown";

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
    <div
      data-details-panel
      className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-surface transition-all duration-300"
    >
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Info className="h-4 w-4 text-primary-text" />
            Media Details
          </h3>
          <button
            onClick={() => setSelectedVideoId(null)}
            className="cursor-pointer rounded-lg p-1 text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable details content */}
        <div className="flex-1 space-y-3 overflow-y-auto p-2">
          {/* Visual Preview Frame */}
          <div className="group/sidebar relative aspect-video overflow-hidden rounded-xl border border-border bg-background shadow-inner">
            <img
              src={`adaumc://${selectedVideo.id}/thumbnail`}
              alt={selectedVideo.title}
              className="h-full w-full object-cover"
            />
            <button
              onClick={() => setPlayingVideo(selectedVideo)}
              className="absolute inset-0 flex cursor-pointer items-center justify-center bg-slate-950/45 opacity-0 transition duration-300 group-hover/sidebar:opacity-100"
            >
              <div className="flex h-12 w-12 scale-90 transform items-center justify-center rounded-full bg-primary text-white shadow-lg transition duration-300 group-hover/sidebar:scale-100">
                <Play className="ml-1 h-5 w-5 fill-current" />
              </div>
            </button>
            <div className="absolute bottom-2 left-2 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">
              {selectedVideo.resolution}
            </div>
          </div>

          {/* Title & Info */}
          <div>
            <h4 className="line-clamp-2 text-sm font-bold text-foreground">
              {selectedVideo.title}
            </h4>
            <span className="mt-1 block select-all font-mono text-[10px] text-muted">
              ID: {selectedVideo.id}
            </span>
          </div>

          {/* Tag Editor Section */}
          <div className="flex">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
              Video Tags
            </span>
            <TagDropdown
              selectedTags={selectedVideo.tags || []}
              onChange={(newTags) => updateVideoTags(selectedVideo.id, newTags)}
              placeholder="Add tags..."
            />
          </div>

          {/* Metadata Grid */}
          <div className="bg-background/50 grid grid-cols-2 gap-3 rounded-xl border border-border p-3 text-xs">
            <div>
              <span className="block text-[10px] font-medium uppercase text-muted">
                Duration
              </span>
              <span className="font-semibold text-foreground">
                {Math.floor(selectedVideo.duration / 60)}:
                {Math.floor(selectedVideo.duration % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-medium uppercase text-muted">
                Resolution
              </span>
              <span className="font-semibold text-foreground">
                {selectedVideo.resolution}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-medium uppercase text-muted">
                Play Count
              </span>
              <span className="font-semibold text-foreground">
                {selectedVideo.playCount || 0} views
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-medium uppercase text-muted">
                Added Date
              </span>
              <span className="font-semibold text-foreground">
                {new Date(selectedVideo.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 border-t border-border pt-4">
            <button
              onClick={() => setPlayingVideo(selectedVideo)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-bold text-white shadow transition hover:bg-primary-hover"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play Video Stream
            </button>

            <button
              onClick={() => onInspectBundle(selectedVideo)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface py-2 text-xs font-semibold text-foreground transition hover:bg-surface-hover"
            >
              <FileText className="h-3.5 w-3.5 text-muted" />
              Inspect Bundle Debugger
            </button>

            <button
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to delete ${selectedVideo.title}?`,
                  )
                ) {
                  deleteVideo(selectedVideo.id);
                }
              }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-500/30 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Video Bundle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
