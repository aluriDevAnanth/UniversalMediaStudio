import React, { useState } from "react";
import { Plus, ChevronUp } from "lucide-react";
import { TagBadge } from "../TagBadge";

interface BulkAddTagMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  tags: string[];
  selectedCount: number;
  onAddTag: (tag: string) => Promise<void>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const BulkAddTagMenu: React.FC<BulkAddTagMenuProps> = ({
  isOpen,
  onToggle,
  tags,
  selectedCount,
  onAddTag,
  containerRef,
}) => {
  const [newTagInput, setNewTagInput] = useState("");

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={onToggle}
        className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary-text transition hover:bg-primary/25"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Tag
        <ChevronUp className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-2xl animate-fade-in">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
            Add Tag to {selectedCount} items
          </div>
          {/* Inline tag creation */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmed = newTagInput.trim();
              if (trimmed) {
                await onAddTag(trimmed);
                setNewTagInput("");
              }
            }}
            className="mb-2 flex gap-1"
          >
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="New tag..."
              className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-2 py-1 text-xs font-bold text-white"
            >
              Add
            </button>
          </form>

          <div className="max-h-48 space-y-1 overflow-y-auto">
            {tags.map((t) => (
              <div
                key={t}
                onClick={async () => {
                  await onAddTag(t);
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
