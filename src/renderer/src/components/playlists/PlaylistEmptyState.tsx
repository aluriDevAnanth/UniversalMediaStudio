import React from "react";
import { Film } from "lucide-react";

export interface PlaylistEmptyStateProps {
  playlistName: string;
}

export const PlaylistEmptyState: React.FC<PlaylistEmptyStateProps> = ({
  playlistName,
}) => {
  return (
    <div className="flex h-full flex-col items-center justify-center text-muted">
      <Film className="mb-2 h-8 w-8 opacity-40" />
      <p className="text-sm font-semibold text-foreground">
        No videos in "{playlistName}" yet
      </p>
      <p className="mt-1 text-xs">
        Right-click videos in the library or use context menu to add them here.
      </p>
    </div>
  );
};
