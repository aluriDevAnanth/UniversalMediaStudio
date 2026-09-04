import React, { useState, useEffect, useRef } from "react";
import {
  Tag,
  X,
  Plus,
  Trash2,
  Palette,
  Edit2,
  Check,
  ChevronDown,
  Search,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import {
  PRESET_TAG_COLORS,
  parseTag,
  formatTag,
  getCategoryColor,
} from "../utils/tagColors";
import { TagBadge } from "./TagBadge";

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
    selectedTags,
    addTag,
    deleteTag,
    renameTag,
    setCategoryColor,
    setSelectedTags,
  } = useVideoStore();

  const [newCatInput, setNewCatInput] = useState("");
  const [newNameInput, setNewNameInput] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_TAG_COLORS[0]);

  // Combobox state for category input
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catComboboxRef = useRef<HTMLDivElement>(null);
  // Inline editing state: tag being edited -> { cat, name }
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editCatInput, setEditCatInput] = useState("");
  const [editNameInput, setEditNameInput] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
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

  // Automatic Color Synchronization when newCatInput changes
  useEffect(() => {
    const cat = newCatInput.trim();
    if (cat) {
      const color = getCategoryColor(cat, categoryColors);
      setSelectedColor(color);
    }
  }, [newCatInput, categoryColors]);

  // Close category combobox dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        catComboboxRef.current &&
        !catComboboxRef.current.contains(event.target as Node)
      ) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!open) return null;

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(newCatInput.toLowerCase().trim()),
  );

  return (
    <div
      className="animate-fade-in fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border bg-surface flex h-[90vh] max-h-[90vh] w-[92vw] max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        {/* Dialog Header */}
        <div className="border-border bg-background/60 flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/15 text-primary-text flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-foreground text-sm font-bold tracking-tight">
                Taxonomy & Tag Manager
              </h2>
              <p className="text-muted text-[11px]">
                Organize, color-code, and manage all taxonomy categories and tags across your library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-lg p-1.5 transition"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Creator Bar */}
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
          className="border-border bg-background/40 flex flex-wrap items-center gap-2.5 border-b px-4 py-2.5"
        >
          {/* Category Combobox */}
          <div ref={catComboboxRef} className="relative w-48 shrink-0">
            <div className="border-border bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 flex items-center justify-between rounded-lg border px-2.5 py-1.5 transition">
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => {
                  setNewCatInput(e.target.value);
                  setIsCatDropdownOpen(true);
                }}
                onFocus={() => setIsCatDropdownOpen(true)}
                placeholder="Category (e.g. Genre)..."
                className="text-foreground placeholder-muted/60 w-full bg-transparent text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setIsCatDropdownOpen((prev) => !prev)}
                className="text-muted hover:text-foreground shrink-0 cursor-pointer p-0.5"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            {/* Combobox Dropdown */}
            {isCatDropdownOpen && (
              <div className="border-border bg-surface absolute top-full left-0 z-50 mt-1 max-h-48 w-56 overflow-y-auto rounded-xl border p-1 shadow-2xl">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => {
                    const cColor = getCategoryColor(cat, categoryColors);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setNewCatInput(cat);
                          setSelectedColor(cColor);
                          setIsCatDropdownOpen(false);
                        }}
                        className="hover:bg-surface-hover flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition"
                      >
                        <span className="text-foreground truncate font-medium">
                          {cat}
                        </span>
                        <span
                          style={{ backgroundColor: cColor }}
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                        />
                      </button>
                    );
                  })
                ) : (
                  <div className="text-muted p-2 text-center text-[11px]">
                    Create category "{newCatInput.trim() || "New"}"
                  </div>
                )}
              </div>
            )}
          </div>

          <span className="text-muted text-xs font-bold">:</span>

          {/* Tag Name Input */}
          <input
            type="text"
            value={newNameInput}
            onChange={(e) => setNewNameInput(e.target.value)}
            placeholder="New tag name (e.g. 4K, Synthwave)..."
            className="border-border bg-background text-foreground placeholder-muted/60 focus:border-primary focus:ring-1 focus:ring-primary/30 flex-1 min-w-44 rounded-lg border px-3 py-1.5 text-xs focus:outline-none transition"
          />

          {/* Color Selector */}
          <div className="flex items-center gap-1.5 shrink-0 bg-background/60 border border-border/80 rounded-lg px-2 py-1">
            <span className="text-muted text-[10px] font-semibold uppercase tracking-wider mr-0.5">
              Color:
            </span>
            {PRESET_TAG_COLORS.slice(0, 6).map((c) => (
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
                className={`h-4 w-4 cursor-pointer rounded-full transition-transform ${
                  selectedColor === c
                    ? "ring-2 ring-white scale-110"
                    : "opacity-60 hover:opacity-100 hover:scale-110"
                }`}
                title={`Set category color ${c}`}
              />
            ))}
            {/* Custom Color Input */}
            <label
              className="border-border bg-surface relative flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border transition hover:scale-110"
              title="Custom color picker"
            >
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => {
                  const color = e.target.value;
                  setSelectedColor(color);
                  if (newCatInput.trim()) {
                    setCategoryColor(newCatInput.trim(), color);
                  }
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <Palette
                className="h-2.5 w-2.5"
                style={{ color: selectedColor }}
              />
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="bg-primary hover:bg-primary-hover flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Tag
          </button>
        </form>

        {/* Filter & Search Bar */}
        <div className="border-border/70 bg-background/30 flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs font-bold tracking-wider uppercase">
              Taxonomy Categories ({categories.length})
            </span>
            <span className="text-muted bg-surface/80 border-border/80 rounded-full border px-2 py-0.5 text-[10px] font-medium">
              {tags.length} registered tags
            </span>
          </div>

          {/* Search Input */}
          <div className="relative w-64">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search category or tag..."
              className="border-border bg-background text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 w-full rounded-lg border py-1 pr-7 pl-7 text-xs focus:outline-none transition"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery("")}
                className="text-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-0.5"
                title="Clear filter"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Taxonomy List - Fills Remaining Viewport Height */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {tags.length === 0 ? (
            <div className="text-muted flex h-full flex-col items-center justify-center py-16 text-center">
              <Tag className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm font-semibold">No tags registered yet.</p>
              <p className="mt-1 text-xs">
                Use the form above to create your first category and tag.
              </p>
            </div>
          ) : categories.filter((category) => {
              if (!filterQuery.trim()) return true;
              const q = filterQuery.toLowerCase().trim();
              if (category.toLowerCase().includes(q)) return true;
              const catTags = groupedTags[category] || [];
              return catTags.some((t) =>
                parseTag(t).name.toLowerCase().includes(q),
              );
            }).length === 0 ? (
            <div className="text-muted flex h-full flex-col items-center justify-center py-16 text-center text-xs">
              <Search className="mb-2 h-8 w-8 opacity-30" />
              <p className="font-semibold">No matching tags or categories found</p>
              <p className="mt-1 text-muted/70">
                Try searching for a different keyword or create a new tag above.
              </p>
            </div>
          ) : (
            categories
              .filter((category) => {
                if (!filterQuery.trim()) return true;
                const q = filterQuery.toLowerCase().trim();
                if (category.toLowerCase().includes(q)) return true;
                const catTags = groupedTags[category] || [];
                return catTags.some((t) =>
                  parseTag(t).name.toLowerCase().includes(q),
                );
              })
              .map((category) => {
                const catColor = getCategoryColor(category, categoryColors);
                const allCatTags = groupedTags[category] || [];
                const q = filterQuery.toLowerCase().trim();
                const catTags = q
                  ? allCatTags.filter(
                      (t) =>
                        category.toLowerCase().includes(q) ||
                        parseTag(t).name.toLowerCase().includes(q),
                    )
                  : allCatTags;

                const isAllSelected =
                  allCatTags.length > 0 &&
                  allCatTags.every((t) => selectedTags.includes(t));
                const isSomeSelected =
                  allCatTags.some((t) => selectedTags.includes(t)) &&
                  !isAllSelected;

                const toggleCategoryTags = (cTags: string[]) => {
                  if (isAllSelected) {
                    setSelectedTags(
                      selectedTags.filter((t) => !cTags.includes(t)),
                    );
                  } else {
                    setSelectedTags(
                      Array.from(new Set([...selectedTags, ...cTags])),
                    );
                  }
                };

                const handleSaveEdit = async (t: string) => {
                  const newFormatted = formatTag(
                    editCatInput,
                    editNameInput,
                  );
                  if (newFormatted && newFormatted !== t) {
                    await renameTag(t, newFormatted);
                  }
                  setEditingTag(null);
                };

                return (
                  <div
                    key={category}
                    className="group/cat border-border/70 bg-surface/40 hover:border-border hover:bg-surface/60 rounded-xl border p-3 transition shadow-xs"
                  >
                    {/* Category Header Row */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        {/* Category Bulk Checkbox */}
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeSelected;
                          }}
                          onChange={() => toggleCategoryTags(allCatTags)}
                          title={
                            isAllSelected
                              ? "Deselect all category tags"
                              : "Select all category tags"
                          }
                          className="accent-primary border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer rounded"
                        />

                        {/* Category Color Indicator */}
                        <span
                          style={{ backgroundColor: catColor }}
                          className="h-3 w-3 shrink-0 rounded-full shadow-xs"
                        />

                        <h3 className="text-foreground text-xs font-extrabold tracking-wider uppercase">
                          {category}
                        </h3>

                        <span className="text-muted bg-background/80 border-border/80 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                          {allCatTags.length} tag{allCatTags.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Category Palette & Delete Action */}
                      <div className="flex items-center gap-2">
                        {/* Mini Color Dots */}
                        <div className="flex items-center gap-1">
                          {PRESET_TAG_COLORS.slice(0, 6).map((c) => (
                            <button
                              key={c}
                              onClick={() => setCategoryColor(category, c)}
                              style={{ backgroundColor: c }}
                              className={`h-3 w-3 cursor-pointer rounded-full transition-transform ${
                                catColor === c
                                  ? "scale-125 ring-1.5 ring-white"
                                  : "opacity-40 hover:opacity-100 hover:scale-110"
                              }`}
                              title={`Set ${category} color to ${c}`}
                            />
                          ))}
                        </div>

                        {/* Bulk Delete Category Action */}
                        <button
                          onClick={async () => {
                            if (
                              confirm(
                                `Delete category "${category}" and all ${allCatTags.length} tag(s) globally from all videos?`,
                              )
                            ) {
                              for (const t of allCatTags) {
                                await deleteTag(t);
                              }
                            }
                          }}
                          title={`Delete category "${category}" and its tags`}
                          className="text-muted hover:bg-rose-500/15 hover:text-rose-500 cursor-pointer rounded p-1 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Tags Wrapped Chips */}
                    <div className="flex flex-wrap gap-2 pt-2.5">
                      {catTags.map((t) => {
                        const { category: cName, name: tName } = parseTag(t);
                        const isEditing = editingTag === t;
                        const videoCount = videos.filter((v) =>
                          v.tags.includes(t),
                        ).length;

                        if (isEditing) {
                          return (
                            <div
                              key={t}
                              className="border-primary/60 bg-background flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs shadow-md"
                            >
                              <input
                                type="text"
                                value={editCatInput}
                                onChange={(e) =>
                                  setEditCatInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEdit(t);
                                  if (e.key === "Escape") setEditingTag(null);
                                }}
                                placeholder="Category"
                                className="text-foreground w-20 bg-transparent text-xs focus:outline-none"
                              />
                              <span className="text-muted font-bold">:</span>
                              <input
                                type="text"
                                value={editNameInput}
                                onChange={(e) =>
                                  setEditNameInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEdit(t);
                                  if (e.key === "Escape") setEditingTag(null);
                                }}
                                placeholder="Tag Name"
                                autoFocus
                                className="text-foreground w-24 bg-transparent text-xs font-semibold focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveEdit(t)}
                                className="bg-primary hover:bg-primary-hover cursor-pointer rounded p-1 text-white transition"
                                title="Save changes (Enter)"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setEditingTag(null)}
                                className="text-muted hover:text-foreground cursor-pointer p-1 transition"
                                title="Cancel (Esc)"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={t}
                            className="group/tag border-border/70 bg-surface/80 hover:bg-surface hover:border-primary/50 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs shadow-2xs transition-all duration-150"
                          >
                            <TagBadge
                              rawTag={t}
                              size="sm"
                              showDot
                              showCategory={false}
                            />
                            <span className="text-muted bg-background/60 rounded px-1.5 py-0.5 text-[10px] font-medium">
                              {videoCount} vid{videoCount !== 1 ? "s" : ""}
                            </span>

                            {/* Action buttons ONLY shown on hover over this tag */}
                            <div className="flex items-center gap-0.5 opacity-0 pointer-events-none group-hover/tag:opacity-100 group-hover/tag:pointer-events-auto transition-opacity duration-150 ml-0.5">
                              <button
                                onClick={() => {
                                  setEditingTag(t);
                                  setEditCatInput(cName);
                                  setEditNameInput(tName);
                                }}
                                title="Edit tag"
                                className="text-muted hover:bg-primary/20 hover:text-primary-text cursor-pointer rounded p-1 transition"
                              >
                                <Edit2 className="h-3 w-3" />
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
                                className="text-muted hover:bg-rose-500/20 hover:text-rose-500 cursor-pointer rounded p-1 transition"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Dialog Footer */}
        <div className="border-border bg-background/60 flex items-center justify-between border-t px-4 py-2.5">
          <span className="text-muted text-[11px]">
            {categories.length} categories • {tags.length} total tags
          </span>
          <button
            onClick={onClose}
            className="border-border bg-surface text-muted hover:border-primary-border/40 hover:text-foreground cursor-pointer rounded-lg border px-4 py-1.5 text-xs font-semibold transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
