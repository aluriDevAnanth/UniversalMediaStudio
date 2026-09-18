import React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";

export interface TagDropdownSearchBarProps {
  searchTagQuery: string;
  selectedTagsCount: number;
  mode: "filter" | "editor";
  tagMatchMode: "ANY" | "ALL";
  onSearchChange: (query: string) => void;
  onClearTags: () => void;
  onSetMatchMode: (mode: "ANY" | "ALL") => void;
}

export const TagDropdownSearchBar: React.FC<TagDropdownSearchBarProps> = ({
  searchTagQuery,
  selectedTagsCount,
  mode,
  tagMatchMode,
  onSearchChange,
  onClearTags,
  onSetMatchMode,
}) => {
  return (
    <div className="border-border bg-background/40 flex flex-col gap-1.5 border-b p-2">
      <div className="flex items-center justify-between gap-1.5">
        <div className="relative flex-1">
          <Search className="text-muted pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="text"
            value={searchTagQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search or #Category:Tag..."
            className="bg-background border-border text-foreground focus:border-primary placeholder-muted/60 w-full rounded-lg border py-1 pr-6 pl-8 text-xs focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          {searchTagQuery && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSearchChange("");
              }}
              className="text-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {selectedTagsCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearTags();
            }}
            className="text-primary-text shrink-0 cursor-pointer text-[10px] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {mode === "filter" && selectedTagsCount > 1 && (
        <div className="bg-surface border-border/60 flex items-center justify-between rounded-lg border p-1 text-[10px]">
          <span className="text-muted flex items-center gap-1 pl-1 font-medium">
            <SlidersHorizontal className="text-primary-text h-3 w-3" />
            Match Mode:
          </span>
          <div className="bg-background border-border/40 flex rounded border p-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetMatchMode("ANY");
              }}
              className={`cursor-pointer rounded px-2 py-0.5 font-bold transition ${
                tagMatchMode === "ANY"
                  ? "bg-primary text-white shadow"
                  : "text-muted hover:text-foreground"
              }`}
              title="Show videos matching AT LEAST ONE tag"
            >
              ANY (OR)
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetMatchMode("ALL");
              }}
              className={`cursor-pointer rounded px-2 py-0.5 font-bold transition ${
                tagMatchMode === "ALL"
                  ? "bg-primary text-white shadow"
                  : "text-muted hover:text-foreground"
              }`}
              title="Show videos matching ALL selected tags"
            >
              ALL (AND)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
