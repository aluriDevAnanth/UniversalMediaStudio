import React, { useState } from "react";
import { Tag, X, Plus, Trash2 } from "lucide-react";
import { useVideoStore } from "../store/videoStore";

interface TagManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

export const TagManagerDialog: React.FC<TagManagerDialogProps> = ({
  open,
  onClose,
}) => {
  const { tags, videos, addTag, deleteTag } = useVideoStore();
  const [newTagInput, setNewTagInput] = useState("");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Dialog Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary-text" />
            Global Tag Manager
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover text-muted hover:text-foreground rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Add Tag Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmed = newTagInput.trim();
              if (trimmed) {
                await addTag(trimmed);
                setNewTagInput("");
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="Create a new tag..."
              className="flex-1 text-sm bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </form>

          {/* Tags List */}
          <div className="space-y-1.5">
            {tags.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No tags created yet.</p>
                <p className="text-xs mt-1">Use the field above to create your first tag.</p>
              </div>
            ) : (
              tags.map((t) => {
                const count = videos.filter((v) => v.tags.includes(t)).length;
                return (
                  <div
                    key={t}
                    className="flex items-center justify-between text-sm p-3 bg-background border border-border rounded-xl hover:border-primary-border/40 transition"
                  >
                    <span className="font-semibold text-foreground">
                      #{t}
                      <span className="text-xs text-muted font-normal ml-2">
                        {count} video{count !== 1 ? "s" : ""}
                      </span>
                    </span>
                    <button
                      onClick={() => deleteTag(t)}
                      title="Delete tag globally from all videos"
                      className="p-1.5 hover:bg-rose-500/20 text-muted hover:text-rose-500 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="px-6 py-3 border-t border-border bg-background/50 flex items-center justify-between">
          <span className="text-[10px] text-muted">
            {tags.length} tag{tags.length !== 1 ? "s" : ""} registered
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-muted hover:text-foreground border border-border hover:border-primary-border/40 rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
