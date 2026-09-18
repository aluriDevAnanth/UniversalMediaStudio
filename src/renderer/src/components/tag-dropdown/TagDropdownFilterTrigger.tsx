import React from "react";
import { Tag, X, ChevronDown } from "lucide-react";
import { TagBadge } from "../TagBadge";

export interface TagDropdownFilterTriggerProps {
  selectedTags: string[];
  placeholder?: string;
  dropdownOpen: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onToggleDropdown: () => void;
  onClearTags: () => void;
}

export const TagDropdownFilterTrigger: React.FC<TagDropdownFilterTriggerProps> = ({
  selectedTags,
  placeholder,
  dropdownOpen,
  triggerRef,
  onToggleDropdown,
  onClearTags,
}) => {
  const getVisibleSelectedTags = () => {
    let currentLength = 0;
    const visible: string[] = [];
    const maxLength = 24;

    for (const t of selectedTags) {
      if (currentLength + t.length + 2 > maxLength) {
        break;
      }
      visible.push(t);
      currentLength += t.length + 2;
    }
    const remaining = selectedTags.length - visible.length;
    return { visible, remaining };
  };

  const { visible: visibleSelected, remaining: remainingSelected } =
    getVisibleSelectedTags();

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onToggleDropdown}
      className={`flex max-w-[280px] cursor-pointer items-center gap-2 overflow-hidden rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
        selectedTags.length > 0
          ? "bg-primary/15 text-primary-text border-primary-border/40 border"
          : "bg-background text-muted hover:text-foreground hover:bg-surface-hover border-border border"
      }`}
    >
      <Tag className="h-3.5 w-3.5 shrink-0" />

      {selectedTags.length === 0 ? (
        <span className="truncate">{placeholder || "All Tags"}</span>
      ) : (
        <div className="flex items-center gap-1 truncate overflow-hidden">
          {visibleSelected.map((t) => (
            <TagBadge key={t} rawTag={t} size="xs" />
          ))}
          {remainingSelected > 0 && (
            <span className="text-primary-text bg-primary/20 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold">
              +{remainingSelected}
            </span>
          )}
        </div>
      )}

      {selectedTags.length > 0 ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onClearTags();
          }}
          className="hover:bg-primary/20 ml-1.5 shrink-0 cursor-pointer rounded p-0.5"
          title="Clear tags"
        >
          <X className="h-3 w-3" />
        </span>
      ) : (
        <ChevronDown
          className={`ml-1.5 h-3 w-3 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
        />
      )}
    </button>
  );
};
