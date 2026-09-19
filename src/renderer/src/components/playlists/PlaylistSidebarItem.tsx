import React from "react";
import { Clock, Star, ListVideo, Trash2 } from "lucide-react";
import { PlaylistRecord } from "../../env";

export interface PlaylistSidebarItemProps {
  playlist: PlaylistRecord;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
}

export const PlaylistSidebarItem: React.FC<PlaylistSidebarItemProps> = ({
  playlist,
  isActive,
  onSelect,
  onDelete,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`flex w-full cursor-pointer items-center justify-between rounded-xl p-2.5 transition ${
        isActive
          ? "shadow-primary/20 bg-primary text-white shadow-lg"
          : "bg-background/40 border border-transparent text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {playlist.id === "watch_later" ? (
          <Clock
            className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-primary-text"}`}
          />
        ) : playlist.id === "favourite" ? (
          <Star className="h-4 w-4 shrink-0 animate-pulse fill-current text-amber-500" />
        ) : (
          <ListVideo className="h-4 w-4 shrink-0 text-muted" />
        )}
        <span className="truncate text-xs sm:text-sm font-semibold">
          {playlist.name}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="bg-background/60 rounded px-1.5 py-0.5 font-mono text-xs text-foreground">
          {playlist.videoIds.length}
        </span>
        {!playlist.isDefault && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(playlist.id);
            }}
            className="p-1 transition hover:text-rose-500"
            title="Delete playlist"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
