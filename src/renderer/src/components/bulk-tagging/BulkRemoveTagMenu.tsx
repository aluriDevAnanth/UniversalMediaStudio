import React from "react";
import { MinusCircle, ChevronUp } from "lucide-react";
import { TagBadge } from "../TagBadge";

interface BulkRemoveTagMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  tags: string[];
  selectedCount: number;
  onRemoveTag: (tag: string) => Promise<void>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const BulkRemoveTagMenu: React.FC<BulkRemoveTagMenuProps> = ({
  isOpen,
  onToggle,
  tags,
  selectedCount,
  onRemoveTag,
  containerRef,
}) => {
  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={onToggle}
        className="border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
      >
        <MinusCircle className="h-3.5 w-3.5" />
        Remove Tag
        <ChevronUp className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="border-border bg-surface animate-fade-in absolute bottom-full left-0 mb-2 w-64 rounded-xl border p-2 shadow-2xl">
          <div className="text-muted mb-2 text-[10px] font-bold tracking-wider uppercase">
            Remove Tag from {selectedCount} items
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {tags.map((t) => (
              <div
                key={t}
                onClick={async () => {
                  await onRemoveTag(t);
                }}
                className="hover:bg-surface-hover flex w-full cursor-pointer items-center justify-between rounded-lg p-1 transition"
              >
                <TagBadge rawTag={t} size="sm" showDot />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
