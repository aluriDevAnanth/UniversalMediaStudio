import React from "react";
import { Check } from "lucide-react";
import { TagBadge } from "../TagBadge";
import { getCategoryColor } from "../../utils/tagColors";

export interface TagDropdownListProps {
  groupedFilteredTags: Record<string, string[]>;
  categoryColors: Record<string, string>;
  selectedTags: string[];
  searchTagQuery: string;
  onToggleTag: (tag: string) => void;
}

export const TagDropdownList: React.FC<TagDropdownListProps> = ({
  groupedFilteredTags,
  categoryColors,
  selectedTags,
  searchTagQuery,
  onToggleTag,
}) => {
  if (Object.keys(groupedFilteredTags).length === 0) {
    return (
      <div className="text-muted px-3 py-6 text-center text-xs">
        <p>No tags found.</p>
        <p className="mt-1 text-[10px]">Click "+" below to create one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {Object.keys(groupedFilteredTags).map((cat) => {
        const catColor = getCategoryColor(cat, categoryColors);
        const catTags = groupedFilteredTags[cat];

        return (
          <div key={cat} className="space-y-1">
            <div className="text-muted flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: catColor }}
              />
              {cat}
            </div>

            <div className="flex flex-col gap-0.5">
              {catTags.map((t) => {
                const checked = selectedTags.includes(t);

                return (
                  <div
                    key={t}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTag(t);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs transition ${
                      checked
                        ? "bg-primary/15 text-primary-text font-semibold"
                        : "text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition ${
                          checked
                            ? "bg-primary text-white"
                            : "bg-background border-border border"
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>

                      <TagBadge
                        rawTag={t}
                        size="sm"
                        showDot
                        searchQuery={searchTagQuery}
                        selected={checked}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
