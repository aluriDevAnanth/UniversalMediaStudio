import React from "react";
import { X, Terminal, Keyboard } from "lucide-react";

export interface PlayerHeaderProps {
  title: string;
  showLogs: boolean;
  onToggleLogs: () => void;
  onOpenShortcuts: () => void;
  onClose: () => void;
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({
  title,
  showLogs,
  onToggleLogs,
  onOpenShortcuts,
  onClose,
}) => {
  return (
    <div className="border-border/70 bg-background/60 relative z-30 shrink-0 flex items-center justify-between border-b px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 mr-2">
        <span className="bg-primary/20 text-primary-text border-primary-border/40 shrink-0 rounded border px-2 py-0.5 text-[11px] sm:text-xs font-bold backdrop-blur-xs">
          ADAUMC Player
        </span>
        <h2 className="text-foreground truncate text-sm sm:text-base font-bold">
          {title}
        </h2>
      </div>

      <div className="relative z-30 flex items-center gap-1.5 sm:gap-2 shrink-0 pointer-events-auto">
        <button
          type="button"
          onClick={onOpenShortcuts}
          title="Player Shortcuts (? or F1)"
          className="bg-surface hover:bg-surface-hover text-muted hover:text-foreground border-border cursor-pointer rounded-xl border p-1.5 transition pointer-events-auto"
        >
          <Keyboard className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleLogs}
          title="Container Telemetry Logs (~ or `)"
          className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition pointer-events-auto ${
            showLogs
              ? "bg-primary border-primary-border text-white"
              : "bg-surface hover:bg-surface-hover text-muted border-border hover:text-foreground"
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{showLogs ? "Hide Logs" : "Bundle Logs"}</span>
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          title="Close Player (Esc)"
          className="relative z-40 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-border/80 bg-surface hover:border-red-500/40 hover:bg-red-500/20 text-muted hover:text-red-400 transition active:scale-95 pointer-events-auto select-none"
        >
          <X className="pointer-events-none h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
};
