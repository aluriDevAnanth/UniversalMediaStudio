import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Keyboard,
  Search,
  Layers,
  PlaySquare,
  ListVideo,
  Sparkles,
  Command,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";

interface ShortcutItem {
  keys: string[];
  label: string;
  description?: string;
  category: "global" | "grid" | "player" | "playlists_tags";
}

const SHORTCUTS: ShortcutItem[] = [
  // Global & Navigation
  {
    keys: ["Ctrl", "K"],
    label: "Focus Search Bar",
    description: "Instantly jump to search video library or tag filter",
    category: "global",
  },
  {
    keys: ["/"],
    label: "Quick Search",
    description: "Quickly focus the search bar (when not in an input)",
    category: "global",
  },
  {
    keys: ["Ctrl", "O"],
    label: "Import Video File",
    description: "Open file picker to import and process video",
    category: "global",
  },
  {
    keys: ["Ctrl", "1"],
    label: "Library Tab",
    description: "Switch to video grid library",
    category: "global",
  },
  {
    keys: ["Ctrl", "2"],
    label: "Playlists Tab",
    description: "Switch to playlists & collections view",
    category: "global",
  },
  {
    keys: ["Ctrl", "3"],
    label: "Storage Tab",
    description: "Switch to storage & disk space manager",
    category: "global",
  },
  {
    keys: ["Ctrl", "4"],
    label: "Analytics Tab",
    description: "Switch to viewing insights & stats",
    category: "global",
  },
  {
    keys: ["Ctrl", "T"],
    label: "Tag Manager",
    description: "Open Tag & Category manager dialog",
    category: "global",
  },
  {
    keys: ["Ctrl", "D"],
    label: "Toggle Theme",
    description: "Switch between Dark and Light mode",
    category: "global",
  },
  {
    keys: ["Ctrl", "L"],
    label: "Lock Studio",
    description: "Quickly lock the application with password",
    category: "global",
  },
  {
    keys: ["?"],
    label: "Shortcuts Cheatsheet",
    description: "Show this keyboard shortcuts guide (also F1 or Ctrl+/)",
    category: "global",
  },
  {
    keys: ["Esc"],
    label: "Close / Deselect",
    description: "Close active modal, deselect items, or exit focus",
    category: "global",
  },

  // Library & Grid
  {
    keys: ["↑", "↓", "←", "→"],
    label: "Navigate Grid",
    description: "Move selection focus across video cards",
    category: "grid",
  },
  {
    keys: ["Enter"],
    label: "Play Selected Video",
    description: "Open video in the built-in media player",
    category: "grid",
  },
  {
    keys: ["Space"],
    label: "Toggle Multi-Select",
    description: "Select / deselect video for batch actions",
    category: "grid",
  },
  {
    keys: ["Ctrl", "A"],
    label: "Select All Videos",
    description: "Select all visible videos in current view",
    category: "grid",
  },
  {
    keys: ["I"],
    label: "Toggle Media Details",
    description: "Open / close right-side details panel for selected video",
    category: "grid",
  },
  {
    keys: ["B"],
    label: "Bundle Explorer",
    description: "Open .adaumc bundle inspector / debugger",
    category: "grid",
  },
  {
    keys: ["Delete"],
    label: "Delete Video(s)",
    description: "Delete currently selected video or batch selection",
    category: "grid",
  },
  {
    keys: ["T"],
    label: "Quick Tag",
    description: "Open tag assignment dropdown for selected video",
    category: "grid",
  },

  // Video Player
  {
    keys: ["Space"],
    label: "Play / Pause",
    description: "Toggle video playback (also works with 'K')",
    category: "player",
  },
  {
    keys: ["←", "→"],
    label: "Seek 5 Seconds",
    description: "Rewind or forward 5 seconds",
    category: "player",
  },
  {
    keys: ["J", "L"],
    label: "Seek 10 Seconds",
    description: "Rewind (J) or forward (L) 10 seconds",
    category: "player",
  },
  {
    keys: [",", "."],
    label: "Frame Step",
    description: "Step backward (,) or forward (.) one frame when paused",
    category: "player",
  },
  {
    keys: ["↑", "↓"],
    label: "Volume Control",
    description: "Increase or decrease audio volume by 5%",
    category: "player",
  },
  {
    keys: ["M"],
    label: "Toggle Mute",
    description: "Mute or unmute audio stream",
    category: "player",
  },
  {
    keys: ["F"],
    label: "Fullscreen",
    description: "Toggle fullscreen video mode",
    category: "player",
  },
  {
    keys: ["C"],
    label: "Captions / Subtitles",
    description: "Toggle closed captions display on/off",
    category: "player",
  },
  {
    keys: ["<", ">"],
    label: "Speed Control",
    description: "Slow down (<) or speed up (>) playback rate (also [ and ])",
    category: "player",
  },
  {
    keys: ["0"],
    label: "Jump to Start",
    description: "Rewind to 00:00 (also Home key)",
    category: "player",
  },
  {
    keys: ["L"],
    label: "Toggle Event Logs",
    description: "Show / hide container metadata & packaging logs drawer (or `)",
    category: "player",
  },
  {
    keys: ["T"],
    label: "Edit Tags",
    description: "Toggle video tag editor within the player modal",
    category: "player",
  },

  // Playlists & Tags
  {
    keys: ["N"],
    label: "New Playlist",
    description: "Create a new custom playlist (in Playlists view)",
    category: "playlists_tags",
  },
  {
    keys: ["Enter"],
    label: "Submit / Save",
    description: "Confirm creating tag, renaming, or creating playlist",
    category: "playlists_tags",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Shortcuts", icon: Sparkles },
  { id: "global", label: "Global & Navigation", icon: Command },
  { id: "grid", label: "Library & Grid", icon: Layers },
  { id: "player", label: "Video Player", icon: PlaySquare },
  { id: "playlists_tags", label: "Playlists & Tags", icon: ListVideo },
];

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsOpen, setShortcutsOpen } = useVideoStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isShortcutsOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
      setActiveCategory("all");
    }
  }, [isShortcutsOpen]);

  if (!isShortcutsOpen) return null;

  const filteredShortcuts = SHORTCUTS.filter((s) => {
    const matchesCategory =
      activeCategory === "all" || s.category === activeCategory;
    if (!matchesCategory) return false;

    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const matchesLabel = s.label.toLowerCase().includes(query);
    const matchesDesc = s.description?.toLowerCase().includes(query);
    const matchesKeys = s.keys.some((k) => k.toLowerCase().includes(query));

    return matchesLabel || matchesDesc || matchesKeys;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => setShortcutsOpen(false)}
    >
      <div
        className="border-border bg-surface text-foreground relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="border-primary-border/40 bg-primary/15 text-primary-text flex h-10 w-10 items-center justify-center rounded-xl border shadow-inner">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Keyboard Shortcuts
              </h2>
              <p className="text-muted text-xs">
                Master UniversalMediaStudio with powerful keyboard controls
              </p>
            </div>
          </div>

          <button
            onClick={() => setShortcutsOpen(false)}
            className="text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-xl p-2 transition"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="border-border bg-background/50 flex flex-col gap-3 border-b px-6 py-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcut or action (e.g., player, seek, import)..."
              className="border-border bg-surface text-foreground placeholder-muted focus:border-primary w-full rounded-xl border py-2 pr-4 pl-10 text-xs transition focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
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
                onClick={() => setActiveCategory(id)}
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

        {/* Shortcuts List Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredShortcuts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted">
              <Keyboard className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm font-semibold text-foreground">
                No shortcuts found
              </p>
              <p className="mt-1 text-xs">
                Try searching for something else or switch categories
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {filteredShortcuts.map((s, index) => (
                <div
                  key={index}
                  className="border-border bg-surface-hover/30 hover:border-primary/40 hover:bg-surface-hover/70 flex items-center justify-between gap-3 rounded-xl border p-3 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-foreground">
                      {s.label}
                    </div>
                    {s.description && (
                      <div className="text-muted mt-0.5 line-clamp-1 text-[11px]">
                        {s.description}
                      </div>
                    )}
                  </div>

                  {/* KBD Badges */}
                  <div className="flex shrink-0 items-center gap-1">
                    {s.keys.map((k, kIndex) => (
                      <kbd
                        key={kIndex}
                        className="border-border bg-background text-foreground shadow-xs inline-flex min-w-[24px] items-center justify-center rounded-md border px-2 py-1 font-mono text-[11px] font-bold tracking-wide"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-border bg-background/50 text-muted flex items-center justify-between border-t px-6 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span>Tip: Press</span>
            <kbd className="border-border bg-surface text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold">
              ?
            </kbd>
            <span>anytime to open this guide</span>
          </div>

          <button
            onClick={() => setShortcutsOpen(false)}
            className="hover:bg-primary-hover bg-primary cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
