import React from "react";
import { Clock, Star, Trash2, Sparkles } from "lucide-react";

interface VideoCardActionsProps {
  isInWatchLater?: boolean;
  isInFavourite?: boolean;
  onToggleWatchLater: (e: React.MouseEvent) => void;
  onToggleFavourite: (e: React.MouseEvent) => void;
  onInspectBundle: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const VideoCardActions: React.FC<VideoCardActionsProps> = ({
  isInWatchLater,
  isInFavourite,
  onToggleWatchLater,
  onToggleFavourite,
  onInspectBundle,
  onDelete,
}) => {
  return (
    <div className="mt-1.5 flex items-center gap-1">
      <div
        onClick={onToggleWatchLater}
        className={`cursor-pointer rounded-lg p-1.5 transition ${
          isInWatchLater
            ? "bg-primary/20 text-primary-text"
            : "text-muted hover:bg-surface-hover hover:text-foreground"
        }`}
        title={
          isInWatchLater
            ? "Remove from Watch Later"
            : "Add to Watch Later"
        }
      >
        <Clock className="size-3" />
      </div>

      <div
        onClick={onToggleFavourite}
        className={`cursor-pointer rounded-lg p-1.5 transition ${
          isInFavourite
            ? "bg-yellow-500/20 text-yellow-400"
            : "text-muted hover:bg-surface-hover hover:text-foreground"
        }`}
        title={isInFavourite ? "Remove from Favorites" : "Add to Favorites"}
      >
        <Star
          className={`size-3 ${isInFavourite ? "fill-current" : ""}`}
        />
      </div>

      <div
        onClick={onInspectBundle}
        className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
        title="Inspect .adaumc Container Assets"
      >
        <Sparkles className="size-3" />
      </div>

      <div
        onClick={onDelete}
        className="ml-auto cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-red-500/20 hover:text-red-400"
        title="Delete Video"
      >
        <Trash2 className="size-3" />
      </div>
    </div>
  );
};
