import React from "react";
import { Search, X } from "lucide-react";

export interface TagFilterBarProps {
  categoriesCount: number;
  tagsCount: number;
  filterQuery: string;
  onFilterChange: (query: string) => void;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  categoriesCount,
  tagsCount,
  filterQuery,
  onFilterChange,
}) => {
  return (
    <div className="border-border/70 bg-background/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b px-2 sm:px-3 py-1.5 sm:py-2">
      <div className="flex items-center gap-2">
        <span className="text-muted text-[11px] sm:text-xs font-bold tracking-wider uppercase">
          Categories ({categoriesCount})
        </span>
        <span className="text-muted bg-surface/80 border-border/80 rounded-full border px-2 py-0.5 text-[10px] font-medium">
          {tagsCount} tags
        </span>
      </div>

      <div className="relative w-full sm:w-64">
        <Search className="text-muted pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Search category or tag..."
          className="border-border bg-background text-foreground placeholder:text-muted focus:border-primary focus:ring-primary/30 w-full rounded-lg border py-1 pr-7 pl-7 text-xs transition focus:ring-1 focus:outline-none"
        />
        {filterQuery && (
          <button
            onClick={() => onFilterChange("")}
            className="text-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-0.5"
            title="Clear filter"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};
