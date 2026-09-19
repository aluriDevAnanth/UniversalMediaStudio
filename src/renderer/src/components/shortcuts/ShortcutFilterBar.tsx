import React from "react";
import { Search, X } from "lucide-react";
import { CATEGORIES } from "./shortcutsData";

export interface ShortcutFilterBarProps {
  search: string;
  activeCategory: string;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (val: string) => void;
  onCategoryChange: (id: string) => void;
  onClearSearch: () => void;
}

export const ShortcutFilterBar: React.FC<ShortcutFilterBarProps> = ({
  search,
  activeCategory,
  searchInputRef,
  onSearchChange,
  onCategoryChange,
  onClearSearch,
}) => {
  return (
    <div className="border-border bg-background/50 flex flex-col gap-3 border-b px-6 py-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="text-muted pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search shortcut or action (e.g., player, seek, import)..."
          className="border-border bg-surface text-foreground placeholder-muted focus:border-primary w-full rounded-xl border py-2 pr-4 pl-10 text-xs transition focus:outline-none"
        />
        {search && (
          <button
            onClick={onClearSearch}
            className="text-muted hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onCategoryChange(id)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeCategory === id
                ? "bg-primary text-white shadow-sm"
                : "border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground border"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
