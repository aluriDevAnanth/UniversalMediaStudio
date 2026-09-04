import React, { useEffect, useRef } from "react";
import {
  Search,
  Lock,
  Upload,
  Minus,
  Square,
  X,
  Sun,
  Moon,
  Keyboard,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { TagDropdown } from "./TagDropdown";
import appIcon from "@/assets/icon.png";

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

  const handleMinimize = () => window.api?.windowControls?.minimize();
  const handleMaximize = () => window.api?.windowControls?.maximize();
  const handleClose = () => window.api?.windowControls?.close();

  return (
    <header className="bg-surface/90 border-border sticky top-0 z-40 border-b px-2 backdrop-blur-md transition-colors duration-200">
      {/* Single Row: Logo | Search + Tags | Actions | Window controls */}
      <div
        className="flex items-center gap-3 py-2"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="border-primary-border/30 bg-primary/20 flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border shadow-md">
            <img
              src={appIcon}
              alt="App Icon"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-foreground flex items-end text-sm font-bold tracking-tight">
            UniversalMediaStudio
            <span className="text-primary font-bolder text-[12px]">
              .adaumc
            </span>
          </h1>
        </div>

        {/* Search + Tag Dropdown */}
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {/* Search */}
          <div className="relative w-64 shrink-0">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or #Category:Tag... (Ctrl+K or /)"
              className="border-border bg-background text-foreground placeholder-muted focus:border-primary w-full rounded-xl border py-1.5 pr-8 pl-9 text-xs transition focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 p-0.5"
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
        </div>

        {/* Action Buttons + Window Controls */}
        <div
          className="flex shrink-0 items-center gap-1.5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={() => importVideoFile()}
            title="Import Video File (Ctrl+O)"
            className="hover:bg-primary/90 bg-primary flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import</span>
          </button>

          {/* Shortcuts cheatsheet button */}
          <button
            onClick={toggleShortcutsOpen}
            title="Keyboard Shortcuts (? or Ctrl+/)"
            className="border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-xl border p-1.5 transition"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={
              theme === "dark"
                ? "Switch to Light Mode (Ctrl+D)"
                : "Switch to Dark Mode (Ctrl+D)"
            }
            className="border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-xl border p-1.5 transition"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5 animate-pulse text-amber-500" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-blue-600" />
            )}
          </button>

          <button
            onClick={lockApp}
            title="Lock Studio (Ctrl+L)"
            className="border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-xl border p-1.5 transition"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>

          {/* Window controls */}
          <div className="border-border flex items-center gap-0.5 border-l pl-2">
            <button
              onClick={handleMinimize}
              title="Minimize Window"
              className="text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-lg p-1.5 transition"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              title="Maximize / Restore Window"
              className="text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-lg p-1.5 transition"
            >
              <Square className="h-3 w-3" />
            </button>
            <button
              onClick={handleClose}
              title="Close Application"
              className="text-muted cursor-pointer rounded-lg p-1.5 transition hover:bg-rose-600 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
