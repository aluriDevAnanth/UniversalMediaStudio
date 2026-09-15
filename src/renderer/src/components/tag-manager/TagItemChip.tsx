import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { TagBadge } from "../TagBadge";

export interface TagItemChipProps {
  tag: string;
  videoCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

export const TagItemChip: React.FC<TagItemChipProps> = ({
  tag,
  videoCount,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="group/tag border-border bg-background hover:bg-surface-hover hover:border-primary/60 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs shadow-2xs transition-all duration-150">
      <TagBadge rawTag={tag} size="sm" showDot showCategory={false} />
      <span className="text-foreground/90 bg-surface border-border rounded border px-1.5 py-0.5 text-[10px] font-bold">
        {videoCount}
      </span>

      <div className="hidden group-hover/tag:inline-flex items-center gap-0.5 ml-0.5">
        <button
          onClick={onEdit}
          title="Edit tag"
          className="text-muted hover:bg-primary/20 hover:text-primary-text cursor-pointer rounded p-1 transition"
        >
          <Edit2 className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          title="Delete tag globally"
          className="text-muted cursor-pointer rounded p-1 transition hover:bg-rose-500/20 hover:text-rose-400"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
