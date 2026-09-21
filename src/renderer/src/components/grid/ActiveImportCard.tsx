import React from "react";
import { Loader2, Sparkles, Clock, Trash2 } from "lucide-react";

export interface ActiveImportCardProps {
  importTask: any;
  onCancel: (taskId: string) => void;
}

export const ActiveImportCard: React.FC<ActiveImportCardProps> = ({
  importTask,
  onCancel,
}) => {
  return (
    <div
      key={importTask.taskId}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-surface/80 border border-border/80 backdrop-blur-md shadow-md"
    >
      {/* Processing Thumbnail */}
      <div className="relative flex aspect-video w-full flex-col items-center justify-center bg-background/70 p-3">
        <div className="bg-primary/30 mb-1.5 flex h-8 w-8 items-center justify-center rounded-full text-primary-text shadow">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
        <span className="max-w-full truncate px-2 text-[11px] font-bold text-foreground">
          Processing {importTask.fileName}
        </span>

        {/* Progress Bar */}
        <div className="mt-2 h-1.5 w-4/5 overflow-hidden rounded-full border border-border/80 bg-surface/80 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-300"
            style={{ width: `${importTask.percent}%` }}
          />
        </div>

        {/* Percentage Badge */}
        <div className="bg-primary/95 animate-fade-in absolute left-1.5 top-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow backdrop-blur-md">
          <Sparkles className="h-2.5 w-2.5 animate-pulse text-amber-300" />
          {importTask.percent}%
        </div>
      </div>

      {/* Card Info */}
      <div className="flex flex-1 flex-col justify-between gap-1 px-2 py-1 bg-surface/75 backdrop-blur-xs">
        <div>
          <h3 className="line-clamp-1 text-xs font-semibold text-foreground">
            {importTask.fileName}
          </h3>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-1.5 text-[10px] text-muted">
          <span className="font-mono font-semibold text-primary-text">
            {importTask.percent}%
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <Clock className="h-3 w-3 text-muted" />
              {importTask.etaSeconds !== null
                ? `${importTask.etaSeconds}s remaining`
                : "Calculating ETA..."}
            </span>
            <button
              onClick={() => onCancel(importTask.taskId)}
              title="Cancel processing and remove card"
              className="cursor-pointer rounded p-1 text-rose-500 transition hover:bg-rose-500/20 hover:text-rose-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
