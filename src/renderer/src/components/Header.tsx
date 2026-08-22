import React from "react";
import {
  Film,
  Search,
  Lock,
  Upload,
  Minus,
  Square,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { TagDropdown } from "./TagDropdown";

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    importVideoFile,
    lockApp,
    theme,
    toggleTheme,
    selectedTags,
  } = useVideoStore();

  const handleMinimize = () => window.api?.windowControls?.minimize();
  const handleMaximize = () => window.api?.windowControls?.maximize();
  const handleClose = () => window.api?.windowControls?.close();

  return (
    <header className="bg-surface/90 sticky top-0 z-40 border-b border-border px-2 backdrop-blur-md transition-colors duration-200">
      {/* Single Row: Logo | Search + Tags | Actions | Window controls */}
      <div
        className="flex items-center gap-3 py-2"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="bg-primary/20 border-primary-border/30 flex h-8 w-8 items-center justify-center rounded-xl border text-primary-text shadow-md">
            <Film className="h-4 w-4" />
          </div>
          <h1 className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-foreground">
            MediaHub
            <span className="bg-primary/20 border-primary-border/30 rounded border px-1.5 py-0.5 text-[9px] font-bold text-primary-text">
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
          <div className="relative w-56 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
              className="w-full rounded-xl border border-border bg-background py-1.5 pl-9 pr-3 text-xs text-foreground placeholder-muted transition focus:border-primary focus:outline-none"
            />
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
          className="flex shrink-0 items-center gap-2"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={() => importVideoFile()}
            className="hover:bg-primary/90 flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={
              theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            }
            className="cursor-pointer rounded-xl border border-border bg-surface p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5 animate-pulse text-amber-500" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-blue-600" />
            )}
          </button>

          <button
            onClick={lockApp}
            title="Lock Application"
            className="cursor-pointer rounded-xl border border-border bg-surface p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>

          {/* Window controls */}
          <div className="flex items-center gap-0.5 border-l border-border pl-2">
            <button
              onClick={handleMinimize}
              title="Minimize Window"
              className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              title="Maximize / Restore Window"
              className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
            >
              <Square className="h-3 w-3" />
            </button>
            <button
              onClick={handleClose}
              title="Close Application"
              className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-rose-600 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
