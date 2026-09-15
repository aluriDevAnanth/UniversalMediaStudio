import React from "react";
import { Tag, X } from "lucide-react";

export interface TagManagerHeaderProps {
  onClose: () => void;
}

export const TagManagerHeader: React.FC<TagManagerHeaderProps> = ({ onClose }) => {
  return (
    <div className="border-border/60 bg-background/50 backdrop-blur-sm flex items-center justify-between border-b px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="flex items-center gap-2.5 min-w-0 mr-2">
        <div className="bg-primary/15 text-primary-text border-primary/25 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
          <Tag className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-foreground text-xs sm:text-sm font-bold tracking-tight truncate">
            Taxonomy & Tag Manager
          </h2>
          <p className="text-muted text-[10px] sm:text-[11px] truncate">
            Organize and color-code taxonomy categories & tags
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-muted hover:bg-surface-hover hover:text-foreground shrink-0 cursor-pointer rounded-lg p-1.5 transition"
        title="Close (Esc)"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
