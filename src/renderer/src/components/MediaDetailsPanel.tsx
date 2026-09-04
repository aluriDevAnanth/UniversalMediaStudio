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
      className="border-border bg-surface flex h-full w-80 shrink-0 flex-col overflow-hidden border-l transition-all duration-300"
    >
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b p-4">
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
          <div className="group/sidebar border-border bg-background relative aspect-video overflow-hidden rounded-xl border shadow-inner">
            <img
              src={`adaumc://${selectedVideo.id}/thumbnail`}
              alt={selectedVideo.title}
              className="h-full w-full object-cover"
            />
            <button
              onClick={() => setPlayingVideo(selectedVideo)}
              className="absolute inset-0 flex cursor-pointer items-center justify-center bg-slate-950/45 opacity-0 transition duration-300 group-hover/sidebar:opacity-100"
            >
              <div className="bg-primary flex h-12 w-12 scale-90 transform items-center justify-center rounded-full text-white shadow-lg transition duration-300 group-hover/sidebar:scale-100">
                <Play className="ml-1 h-5 w-5 fill-current" />
              </div>
            </button>
            <div className="bg-primary absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[9px] font-bold text-white">
              {selectedVideo.resolution}
            </div>
          </div>

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
          <div className="border-border bg-background/50 flex flex-col gap-1.5 rounded-xl border p-3">
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
          <div className="bg-background/50 border-border grid grid-cols-2 gap-3 rounded-xl border p-3 text-xs">
            <div>
              <span className="text-muted block text-[10px] font-medium uppercase">
                Duration
              </span>
              <span className="text-foreground font-semibold">
                {Math.floor(selectedVideo.duration / 60)}:
                {Math.floor(selectedVideo.duration % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] font-medium uppercase">
                Resolution
              </span>
              <span className="text-foreground font-semibold">
                {selectedVideo.resolution}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] font-medium uppercase">
                Play Count
              </span>
              <span className="text-foreground font-semibold">
                {selectedVideo.playCount || 0} views
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] font-medium uppercase">
                Added Date
              </span>
              <span className="text-foreground font-semibold">
                {new Date(selectedVideo.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="border-border space-y-2 border-t pt-4">
            <button
              onClick={() => setPlayingVideo(selectedVideo)}
              title="Play Video Stream (Enter)"
              className="bg-primary hover:bg-primary-hover flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg p-2 text-xs font-bold text-white shadow transition"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Play Video Stream</span>
              <kbd className="ml-auto rounded bg-white/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                Enter
              </kbd>
            </button>

            <button
              onClick={() => onInspectBundle(selectedVideo)}
              title="Inspect Bundle Debugger (B)"
              className="border-border bg-surface text-foreground hover:bg-surface-hover flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border p-2 text-xs font-semibold transition"
            >
              <FileText className="text-muted h-3.5 w-3.5" />
              <span>Inspect Bundle Debugger</span>
              <kbd className="border-border bg-background text-muted ml-auto rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold">
                B
              </kbd>
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
              title="Delete Video Bundle (Delete)"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-500/30 p-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Video Bundle</span>
              <kbd className="border-border bg-background text-muted ml-auto rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold">
                Del
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
