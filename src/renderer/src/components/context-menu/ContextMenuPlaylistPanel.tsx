import React, { useState, useRef } from "react";
import { ListPlus, Check, Plus } from "lucide-react";
import { PlaylistRecord, VideoRecord } from "../../env";

export interface ContextMenuPlaylistPanelProps {
  userPlaylists: PlaylistRecord[];
  video: VideoRecord;
  isAddingPlaylist: boolean;
  onSetIsAddingPlaylist: (val: boolean) => void;
  onTogglePlaylistVideo: (playlistId: string, videoId: string) => void;
  onCreatePlaylist: (name: string) => Promise<void>;
}

export const ContextMenuPlaylistPanel: React.FC<ContextMenuPlaylistPanelProps> = ({
  userPlaylists,
  video,
  isAddingPlaylist,
  onSetIsAddingPlaylist,
  onTogglePlaylistVideo,
  onCreatePlaylist,
}) => {
  const [newPlaylistValue, setNewPlaylistValue] = useState("");
  const newPlaylistInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-background/60 mx-2 mb-1 mt-1 overflow-hidden rounded-lg border border-border">
      {userPlaylists.length === 0 && !isAddingPlaylist ? (
        <p className="px-3 py-2 text-[11px] italic text-muted">
          No playlists yet — create one below.
        </p>
      ) : (
        userPlaylists.map((pl) => {
          const isIn = pl.videoIds.includes(video.id);
          return (
            <button
              key={pl.id}
              onClick={() => onTogglePlaylistVideo(pl.id, video.id)}
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition ${
                isIn
                  ? "bg-primary/5 hover:bg-primary/10 text-primary-text"
                  : "text-foreground hover:bg-surface-hover"
              }`}
            >
              <ListPlus
                className={`h-3 w-3 shrink-0 ${isIn ? "text-primary-text" : "text-muted"}`}
              />
              <span className="flex-1 truncate font-medium">{pl.name}</span>
              {isIn && <Check className="h-3 w-3 shrink-0 text-primary-text" />}
            </button>
          );
        })
      )}

      {isAddingPlaylist ? (
        <div className="border-border/40 bg-background/30 flex items-center gap-1.5 border-t px-3 py-1.5">
          <input
            ref={newPlaylistInputRef}
            type="text"
            value={newPlaylistValue}
            onChange={(e) => setNewPlaylistValue(e.target.value)}
            placeholder="Playlist name…"
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                const trimmed = newPlaylistValue.trim();
                if (trimmed) {
                  await onCreatePlaylist(trimmed);
                  setNewPlaylistValue("");
                  onSetIsAddingPlaylist(false);
                }
              } else if (e.key === "Escape") {
                e.stopPropagation();
                onSetIsAddingPlaylist(false);
                setNewPlaylistValue("");
              }
            }}
            onBlur={() => {
              if (!newPlaylistValue.trim()) onSetIsAddingPlaylist(false);
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetIsAddingPlaylist(true);
          }}
          className="border-border/40 flex w-full cursor-pointer items-center gap-2 border-t px-3 py-1.5 text-xs text-muted transition hover:bg-surface-hover hover:text-primary-text"
        >
          <Plus className="h-3 w-3 shrink-0" />
          <span className="font-medium">New playlist…</span>
        </button>
      )}
    </div>
  );
};
