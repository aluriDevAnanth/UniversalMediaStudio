import React, { useState, useRef, useEffect } from "react";
import {
  CheckSquare,
  X,
  Trash2,
  Plus,
  MinusCircle,
  ChevronUp,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { TagBadge } from "./TagBadge";

export const BulkTaggingToolbar: React.FC = () => {
  const {
    videos,
    tags,
    selectedVideoIds,
    clearVideoSelection,
    selectAllVideos,
    bulkAddTag,
    bulkRemoveTag,
    bulkDeleteSelectedVideos,
  } = useVideoStore();

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [removeMenuOpen, setRemoveMenuOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  const addMenuRef = useRef<HTMLDivElement>(null);
  const removeMenuRef = useRef<HTMLDivElement>(null);

  const allSelected =
    videos.length > 0 && selectedVideoIds.length === videos.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node)
      ) {
        setAddMenuOpen(false);
      }
      if (
        removeMenuRef.current &&
        !removeMenuRef.current.contains(e.target as Node)
      ) {
        setRemoveMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selectedVideoIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border/80 bg-surface/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-200">
      {/* Count & Select All */}
      <div className="flex items-center gap-2 border-r border-border/60 pr-3">
        <button
          onClick={() => {
            if (allSelected) {
              clearVideoSelection();
            } else {
              selectAllVideos(videos.map((v) => v.id));
            }
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-foreground transition hover:bg-surface-hover"
        >
          <CheckSquare
            className={`h-4 w-4 ${allSelected ? "text-primary-text" : "text-muted"}`}
          />
          <span className="tabular-nums">
            {selectedVideoIds.length} selected
          </span>
        </button>
      </div>

      {/* Bulk Add Tag Dropdown */}
      <div ref={addMenuRef} className="relative">
        <button
          onClick={() => {
            setAddMenuOpen((o) => !o);
            setRemoveMenuOpen(false);
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary-text transition hover:bg-primary/25"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Tag
          <ChevronUp className="h-3 w-3" />
        </button>

        {addMenuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-2xl animate-fade-in">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
              Add Tag to {selectedVideoIds.length} items
            </div>
            {/* Inline tag creation */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmed = newTagInput.trim();
                if (trimmed) {
                  await bulkAddTag(trimmed);
                  setNewTagInput("");
                  setAddMenuOpen(false);
                }
              }}
              className="mb-2 flex gap-1"
            >
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="New tag..."
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-2 py-1 text-xs font-bold text-white"
              >
                Add
              </button>
            </form>

            <div className="max-h-48 space-y-1 overflow-y-auto">
              {tags.map((t) => (
                <div
                  key={t}
                  onClick={async () => {
                    await bulkAddTag(t);
                    setAddMenuOpen(false);
                  }}
                  className="hover:bg-surface-hover flex w-full cursor-pointer items-center justify-between rounded-lg p-1 transition"
                >
                  <TagBadge rawTag={t} size="sm" showDot />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Remove Tag Dropdown */}
      <div ref={removeMenuRef} className="relative">
        <button
          onClick={() => {
            setRemoveMenuOpen((o) => !o);
            setAddMenuOpen(false);
          }}
          className="border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
        >
          <MinusCircle className="h-3.5 w-3.5" />
          Remove Tag
          <ChevronUp className="h-3 w-3" />
        </button>

        {removeMenuOpen && (
          <div className="border-border bg-surface animate-fade-in absolute bottom-full left-0 mb-2 w-64 rounded-xl border p-2 shadow-2xl">
            <div className="text-muted mb-2 text-[10px] font-bold tracking-wider uppercase">
              Remove Tag from {selectedVideoIds.length} items
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {tags.map((t) => (
                <div
                  key={t}
                  onClick={async () => {
                    await bulkRemoveTag(t);
                    setRemoveMenuOpen(false);
                  }}
                  className="hover:bg-surface-hover flex w-full cursor-pointer items-center justify-between rounded-lg p-1 transition"
                >
                  <TagBadge rawTag={t} size="sm" showDot />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Delete */}
      <button
        onClick={() => {
          if (
            confirm(
              `Are you sure you want to delete ${selectedVideoIds.length} selected videos?`,
            )
          ) {
            bulkDeleteSelectedVideos();
          }
        }}
        className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-500/20"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete Selected
      </button>

      {/* Clear Selection X */}
      <button
        onClick={clearVideoSelection}
        className="ml-1 cursor-pointer rounded-lg p-1 text-muted transition hover:bg-surface-hover hover:text-foreground"
        title="Deselect all"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
