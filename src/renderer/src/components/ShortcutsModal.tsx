import React, { useState, useEffect, useRef } from "react";
import { Keyboard } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import {
  SHORTCUTS,
  ShortcutItemCard,
  ShortcutHeader,
  ShortcutFilterBar,
} from "./shortcuts/index";

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
        <ShortcutHeader onClose={() => setShortcutsOpen(false)} />

        {/* Search & Category Filter Bar */}
        <ShortcutFilterBar
          search={search}
          activeCategory={activeCategory}
          searchInputRef={searchInputRef}
          onSearchChange={setSearch}
          onCategoryChange={setActiveCategory}
          onClearSearch={() => setSearch("")}
        />

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
                <ShortcutItemCard key={index} shortcut={s} />
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
