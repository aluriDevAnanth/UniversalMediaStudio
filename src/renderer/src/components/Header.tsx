import React, { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { TagDropdown } from "./TagDropdown";
import { SortDropdown } from "./SortDropdown";
import {
  HeaderLogo,
  HeaderWindowControls,
  HeaderActionButtons,
} from "./navigation/index";

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    importVideoFile,
    lockApp,
    theme,
    toggleTheme,
    selectedTags,
    toggleShortcutsOpen,
  } = useVideoStore();

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleFocusSearch = () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    };
    window.addEventListener("focus-search-input", handleFocusSearch);
    return () =>
      window.removeEventListener("focus-search-input", handleFocusSearch);
  }, []);

  return (
    <header className="glass-header sticky top-0 z-40 px-2 transition-colors duration-200">
      <div
        className="flex items-center gap-2 sm:gap-3 py-2"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        {/* App Logo & Title */}
        <HeaderLogo />

        {/* Search + Tag Dropdown + Sort Dropdown */}
        <div
          className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {/* Fluid Search */}
          <div className="relative min-w-[100px] flex-1 max-w-xs">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or #Cat:Tag..."
              className="glass-input text-foreground placeholder-muted focus:border-primary w-full rounded-xl py-1.5 pr-7 pl-8.5 text-xs transition focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-0.5"
                title="Clear search (Esc)"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Unified Tag Selection Component */}
          <TagDropdown
            selectedTags={selectedTags}
            onChange={(newTags) =>
              useVideoStore.setState({ selectedTags: newTags })
            }
            placeholder="All Tags"
          />

          {/* Sort Dropdown */}
          <SortDropdown />
        </div>

        {/* Action Buttons + Window Controls */}
        <div
          className="flex shrink-0 items-center gap-1 sm:gap-1.5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <HeaderActionButtons
            theme={theme}
            onImport={() => importVideoFile()}
            onToggleShortcuts={toggleShortcutsOpen}
            onToggleTheme={toggleTheme}
            onLockApp={lockApp}
          />

          {/* Window Controls */}
          <HeaderWindowControls />
        </div>
      </div>
    </header>
  );
};
