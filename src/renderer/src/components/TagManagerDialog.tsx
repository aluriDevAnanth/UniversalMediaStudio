import React, { useState } from "react";
import {
  Tag,
  X,
  Plus,
  Trash2,
  Palette,
  Folder,
  Edit2,
  Check,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import {
  PRESET_TAG_COLORS,
  parseTag,
  formatTag,
  getCategoryColor,
  getTagStyle,
} from "../utils/tagColors";

interface TagManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

export const TagManagerDialog: React.FC<TagManagerDialogProps> = ({
  open,
  onClose,
}) => {
  const {
    tags,
    categoryColors,
    videos,
    addTag,
    deleteTag,
    renameTag,
    setCategoryColor,
  } = useVideoStore();

  const [newCatInput, setNewCatInput] = useState("General");
  const [newNameInput, setNewNameInput] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_TAG_COLORS[0]);

  // Inline editing state: tag being edited -> { cat, name }
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editCatInput, setEditCatInput] = useState("");
  const [editNameInput, setEditNameInput] = useState("");

  if (!open) return null;

  // Group tags by category
  const groupedTags: Record<string, string[]> = {};
  for (const t of tags) {
    const { category } = parseTag(t);
    if (!groupedTags[category]) {
      groupedTags[category] = [];
    }
    groupedTags[category].push(t);
  }

  const categories = Object.keys(groupedTags).sort();

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border bg-surface w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl">
        {/* Dialog Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-foreground flex items-center gap-2 text-sm font-bold">
            <Tag className="text-primary-text h-4 w-4" />
            Global Taxonomy & Tag CRUD Manager
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-lg p-1.5 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="max-h-[80vh] space-y-2 p-2">
          {/* CREATE: Add Tag Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const cat = newCatInput.trim() || "General";
              const nm = newNameInput.trim();
              if (nm) {
                const formatted = formatTag(cat, nm);
                await addTag(formatted);
                await setCategoryColor(cat, selectedColor);
                setNewNameInput("");
              }
            }}
            className="border-border/80 bg-background/50 space-y-2 rounded-xl border p-2"
          >
            <div className="text-muted ml-2 text-xs font-bold tracking-wider uppercase">
              Create New Category Tag
            </div>
            <div className="flex items-center gap-2">
              <div className="border-border bg-background focus-within:border-primary focus-within:ring-primary flex flex-1 items-center gap-1 rounded-xl border px-3 py-1.5 focus-within:ring-1">
                <Folder className="text-muted h-3.5 w-3.5 shrink-0" />
                <input
                  type="text"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  placeholder="Category (e.g. Genre, Quality)..."
                  className="text-foreground placeholder-muted/60 w-1/3 bg-transparent text-xs focus:outline-none"
                />
                <span className="text-muted text-xs font-bold">:</span>
                <input
                  type="text"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  placeholder="Tag Name (e.g. 4K, Action)..."
                  className="text-foreground placeholder-muted/60 flex-1 bg-transparent text-xs font-medium focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="bg-primary hover:bg-primary-hover flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition"
              >
                <Plus className="h-4 w-4" />
                Create Tag
              </button>
            </div>

            {/* Color Palette Selector for New Category */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-muted flex items-center gap-1 text-[11px] font-semibold">
                <Palette className="h-3 w-3" /> Category Color:
              </span>
              <div className="flex items-center gap-1.5">
                {PRESET_TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedColor(c);
                      if (newCatInput.trim()) {
                        setCategoryColor(newCatInput.trim(), c);
                      }
                    }}
                    style={{ backgroundColor: c }}
                    className={`h-5 w-5 cursor-pointer rounded-full transition hover:scale-110 ${
                      selectedColor === c
                        ? "ring-offset-background scale-110 ring-2 ring-white ring-offset-2"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          </form>

          {/* READ & UPDATE & DELETE: Grouped Tags List */}
          <div className="max-h-[534px] space-y-2 overflow-y-auto px-1">
            <div className="flex items-center justify-between">
              <span className="text-muted mt-2 ml-2 text-xs font-bold tracking-wider uppercase">
                Taxonomy Categories & Tags ({tags.length})
              </span>
            </div>

            {tags.length === 0 ? (
              <div className="text-muted py-8 text-center">
                <Tag className="mx-auto mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm font-semibold">No tags registered yet.</p>
                <p className="mt-1 text-xs">
                  Use the form above to create your first category tag.
                </p>
              </div>
            ) : (
              categories.map((category) => {
                const catColor = getCategoryColor(category, categoryColors);
                const catStyle = getTagStyle(catColor);
                const catTags = groupedTags[category] || [];

                return (
                  <div
                    key={category}
                    className="border-border bg-background space-y-2 rounded-xl border p-2"
                  >
                    {/* Category Header with Color Picker */}
                    <div className="border-border/60 flex items-center justify-between border-b">
                      <div className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: catColor }}
                          className="h-3 w-3 rounded-full"
                        />
                        <h3 className="text-foreground text-xs font-extrabold tracking-wider uppercase">
                          {category}
                        </h3>
                        <span className="text-muted bg-surface border-border rounded-full border px-2 py-0.5 text-[10px] font-normal">
                          {catTags.length} tag{catTags.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Color dots for category */}
                      <div className="flex items-center gap-1">
                        {PRESET_TAG_COLORS.slice(0, 6).map((c) => (
                          <button
                            key={c}
                            onClick={() => setCategoryColor(category, c)}
                            style={{ backgroundColor: c }}
                            className={`h-3.5 w-3.5 cursor-pointer rounded-full transition hover:scale-110 ${
                              catColor === c
                                ? "scale-110 ring-2 ring-white"
                                : "opacity-50 hover:opacity-100"
                            }`}
                            title={`Set ${category} color`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Tag items in this category */}
                    <div className="flex max-h-[108px] flex-wrap gap-2 overflow-y-auto">
                      {catTags.map((t) => {
                        const { category: cName, name: tName } = parseTag(t);
                        const isEditing = editingTag === t;
                        const videoCount = videos.filter((v) =>
                          v.tags.includes(t),
                        ).length;

                        return (
                          <div
                            key={t}
                            className="border-border/80 bg-surface/60 hover:border-primary-border/40 flex items-center rounded-xl border p-1 transition"
                          >
                            {isEditing ? (
                              /* Inline UPDATE Form: text_input:text_input */
                              <div className="mr-2 flex flex-1 items-center gap-1">
                                <input
                                  type="text"
                                  value={editCatInput}
                                  onChange={(e) =>
                                    setEditCatInput(e.target.value)
                                  }
                                  placeholder="Category"
                                  className="bg-background border-primary text-foreground w-20 rounded border px-1.5 py-0.5 text-xs focus:outline-none"
                                />
                                <span className="text-muted text-xs font-bold">
                                  :
                                </span>
                                <input
                                  type="text"
                                  value={editNameInput}
                                  onChange={(e) =>
                                    setEditNameInput(e.target.value)
                                  }
                                  placeholder="Tag Name"
                                  autoFocus
                                  className="bg-background border-primary text-foreground flex-1 rounded border px-1.5 py-0.5 text-xs font-semibold focus:outline-none"
                                />
                                <button
                                  onClick={async () => {
                                    const newFormatted = formatTag(
                                      editCatInput,
                                      editNameInput,
                                    );
                                    if (newFormatted && newFormatted !== t) {
                                      await renameTag(t, newFormatted);
                                    }
                                    setEditingTag(null);
                                  }}
                                  className="bg-primary hover:bg-primary-hover cursor-pointer rounded p-1 text-white"
                                  title="Save tag changes"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => setEditingTag(null)}
                                  className="text-muted hover:text-foreground cursor-pointer p-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              /* Tag Pill & Usage View */
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  style={catStyle}
                                  className="max-w-45 shrink-0 truncate rounded border px-2 py-0.5 text-xs font-bold"
                                >
                                  {cName}:{tName}
                                </span>
                                <span className="text-muted truncate text-[10px]">
                                  {videoCount} video
                                  {videoCount !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}

                            {/* Actions: Edit & Delete */}
                            {!isEditing && (
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingTag(t);
                                    setEditCatInput(cName);
                                    setEditNameInput(tName);
                                  }}
                                  title="Edit category or tag name"
                                  className="text-muted hover:bg-primary/20 hover:text-primary-text cursor-pointer rounded p-1 transition"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        `Delete tag "${t}" globally from all videos?`,
                                      )
                                    ) {
                                      await deleteTag(t);
                                    }
                                  }}
                                  title="Delete tag globally"
                                  className="text-muted cursor-pointer rounded p-1 transition hover:bg-rose-500/20 hover:text-rose-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="border-border bg-background/50 flex items-center justify-between border-t px-6 py-3">
          <span className="text-muted text-[10px]">
            {categories.length} categories • {tags.length} total tags
          </span>
          <button
            onClick={onClose}
            className="border-border text-muted hover:border-primary-border/40 hover:text-foreground cursor-pointer rounded-lg border px-4 py-1.5 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
