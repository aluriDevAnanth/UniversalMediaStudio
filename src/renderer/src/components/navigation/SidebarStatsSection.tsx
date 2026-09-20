import React from "react";
import { Tag, Upload } from "lucide-react";

export interface SidebarStatsSectionProps {
  isExpanded: boolean;
  videoCount: number;
  tagCount: number;
  playlistCount: number;
  onOpenTagManager: () => void;
  onImport: () => void;
}

export const SidebarStatsSection: React.FC<SidebarStatsSectionProps> = ({
  isExpanded,
  videoCount,
  tagCount,
  playlistCount,
  onOpenTagManager,
  onImport,
}) => {
  return (
    <div className="border-border/60 shrink-0 space-y-1 border-t p-1.5">
      {isExpanded && (
        <div className="border-border/40 mb-1.5 space-y-1 border-b px-2 pb-2 pt-1 text-[11px]">
          <div className="text-muted flex justify-between">
            <span>Videos</span>
            <span className="text-foreground font-semibold">{videoCount}</span>
          </div>
          <div className="text-muted flex justify-between">
            <span>Tags</span>
            <span className="text-foreground font-semibold">{tagCount}</span>
          </div>
          <div className="text-muted flex justify-between">
            <span>Playlists</span>
            <span className="text-foreground font-semibold">{playlistCount}</span>
          </div>
        </div>
      )}

      {/* Tag Manager Button */}
      <button
        onClick={onOpenTagManager}
        title="Tag Manager (Ctrl+T)"
        className={`text-foreground hover:bg-surface-hover/70 flex h-9 w-full cursor-pointer items-center rounded-xl px-2.5 text-xs font-semibold backdrop-blur-xs transition ${
          isExpanded ? "justify-between" : "justify-center px-0"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Tag className="h-4 w-4 shrink-0 text-amber-500" />
          {isExpanded && <span className="truncate">Tag Manager</span>}
        </div>
        {isExpanded && (
          <kbd className="border-border/80 bg-background/60 text-muted rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold">
            ^T
          </kbd>
        )}
      </button>

      {/* Quick Import Button */}
      <button
        onClick={onImport}
        title="Import Video File (Ctrl+O)"
        className={`bg-primary/10 text-primary-text border-primary-border/30 hover:bg-primary/20 flex h-9 w-full cursor-pointer items-center rounded-xl border px-2.5 text-xs font-bold transition shadow-xs ${
          isExpanded ? "justify-between" : "justify-center px-0"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Upload className="h-4 w-4 shrink-0" />
          {isExpanded && <span className="truncate">Import Media</span>}
        </div>
        {isExpanded && (
          <kbd className="border-primary-border/40 bg-primary/20 text-primary-text rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold">
            ^O
          </kbd>
        )}
      </button>
    </div>
  );
};
