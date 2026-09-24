import React, { useState, useRef, useEffect } from "react";
import { CheckSquare, X, Trash2 } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { BulkAddTagMenu, BulkRemoveTagMenu } from "./bulk-tagging";

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
    <div className="fixed bottom-16 md:bottom-6 left-1/2 z-50 flex max-w-[95vw] -translate-x-1/2 items-center gap-1.5 sm:gap-3 overflow-x-auto rounded-2xl border border-border/80 bg-surface/95 px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-200">
      {/* Count & Select All */}
      <div className="flex items-center gap-1 sm:gap-2 border-r border-border/60 pr-2 sm:pr-3">
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
      <BulkAddTagMenu
        isOpen={addMenuOpen}
        onToggle={() => {
          setAddMenuOpen((o) => !o);
          setRemoveMenuOpen(false);
        }}
        tags={tags}
        selectedCount={selectedVideoIds.length}
        onAddTag={async (tag) => {
          await bulkAddTag(tag);
          setAddMenuOpen(false);
        }}
        containerRef={addMenuRef}
      />

      {/* Bulk Remove Tag Dropdown */}
      <BulkRemoveTagMenu
        isOpen={removeMenuOpen}
        onToggle={() => {
          setRemoveMenuOpen((o) => !o);
          setAddMenuOpen(false);
        }}
        tags={tags}
        selectedCount={selectedVideoIds.length}
        onRemoveTag={async (tag) => {
          await bulkRemoveTag(tag);
          setRemoveMenuOpen(false);
        }}
        containerRef={removeMenuRef}
      />

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
