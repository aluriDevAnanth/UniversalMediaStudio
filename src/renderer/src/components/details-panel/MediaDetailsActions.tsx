import React from "react";
import { Play, FileText, Trash2 } from "lucide-react";
import { VideoRecord } from "../../env";

interface MediaDetailsActionsProps {
  video: VideoRecord;
  onPlay: () => void;
  onInspectBundle: (video: VideoRecord) => void;
  onDelete: (id: string, title: string) => void;
}

export const MediaDetailsActions: React.FC<MediaDetailsActionsProps> = ({
  video,
  onPlay,
  onInspectBundle,
  onDelete,
}) => {
  return (
    <div className="border-border space-y-2 border-t pt-4">
      <button
        onClick={onPlay}
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
        onClick={() => onInspectBundle(video)}
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
        onClick={() => onDelete(video.id, video.title)}
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
  );
};
