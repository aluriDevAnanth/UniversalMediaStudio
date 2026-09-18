import React from "react";
import { Plus } from "lucide-react";
import { TagBadge } from "../TagBadge";

export interface TagDropdownEditorTriggerProps {
  selectedTags: string[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onToggleDropdown: () => void;
  onRemoveTag: (tag: string) => void;
}

export const TagDropdownEditorTrigger: React.FC<TagDropdownEditorTriggerProps> = ({
  selectedTags,
  triggerRef,
  onToggleDropdown,
  onRemoveTag,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selectedTags.map((t) => (
        <TagBadge
          key={t}
          rawTag={t}
          size="sm"
          onRemove={() => onRemoveTag(t)}
        />
      ))}

      <button
        ref={triggerRef}
        type="button"
        onClick={onToggleDropdown}
        className="border-border hover:border-primary/50 bg-surface hover:bg-surface-hover text-muted hover:text-foreground inline-flex cursor-pointer items-center gap-1 rounded-lg border border-dashed px-2 py-1 text-xs font-semibold transition"
      >
        <Plus className="h-3 w-3" />
        <span>Add Tag</span>
      </button>
    </div>
  );
};
