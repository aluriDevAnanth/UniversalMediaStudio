import React, { useState } from "react";
import { Tag, Search } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import {
  parseTag,
  formatTag,
  getCategoryColor,
} from "../utils/tagColors";
import {
  TagManagerHeader,
  TagCreatorBar,
  TagFilterBar,
  TagCategoryCard,
} from "./tag-manager/index";

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

  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editCatInput, setEditCatInput] = useState("");
  const [editNameInput, setEditNameInput] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

  const groupedTags: Record<string, string[]> = {};
  for (const t of tags) {
    const { category } = parseTag(t);
    if (!groupedTags[category]) {
      groupedTags[category] = [];
    }
    groupedTags[category].push(t);
  }

  const categories = Object.keys(groupedTags).sort();

  if (!open) return null;

  const handleAddTag = async (cat: string, nm: string, selectedColor: string) => {
    const formatted = formatTag(cat, nm);
    await addTag(formatted);
    await setCategoryColor(cat, selectedColor);
  };

  const handleSaveEdit = async (oldTag: string) => {
    const newFormatted = formatTag(editCatInput, editNameInput);
    if (newFormatted && newFormatted !== oldTag) {
      await renameTag(oldTag, newFormatted);
    }
    setEditingTag(null);
  };

  const handleDeleteCategory = async (category: string, allCatTags: string[]) => {
    if (
      confirm(
        `Delete category "${category}" and all ${allCatTags.length} tag(s) globally from all videos?`,
      )
    ) {
      for (const t of allCatTags) {
        await deleteTag(t);
      }
    }
  };

  const toggleCategoryTags = (cTags: string[], isAllSelected: boolean) => {
    if (isAllSelected) {
      setSelectedTags(selectedTags.filter((t) => !cTags.includes(t)));
    } else {
      setSelectedTags(Array.from(new Set([...selectedTags, ...cTags])));
    }
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-2xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-modal flex h-[92vh] max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl">
        {/* Header */}
        <TagManagerHeader onClose={onClose} />

        {/* Creator Bar */}
        <TagCreatorBar
          categories={categories}
          categoryColors={categoryColors}
          onAddTag={handleAddTag}
          onSetCategoryColor={setCategoryColor}
        />

        {/* Filter & Search Bar */}
        <TagFilterBar
          categoriesCount={categories.length}
          tagsCount={tags.length}
          filterQuery={filterQuery}
          onFilterChange={setFilterQuery}
        />

        {/* Scrollable Taxonomy List */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
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
              <p className="font-semibold">
                No matching tags or categories found
              </p>
              <p className="text-muted/70 mt-1">
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

                return (
                  <TagCategoryCard
                    key={category}
                    category={category}
                    catColor={catColor}
                    allCatTags={allCatTags}
                    catTags={catTags}
                    selectedTags={selectedTags}
                    editingTag={editingTag}
                    editCatInput={editCatInput}
                    editNameInput={editNameInput}
                    videos={videos}
                    onToggleCategoryTags={(cTags) =>
                      toggleCategoryTags(cTags, isAllSelected)
                    }
                    onSetCategoryColor={setCategoryColor}
                    onDeleteCategory={handleDeleteCategory}
                    onStartEdit={(t, c, n) => {
                      setEditingTag(t);
                      setEditCatInput(c);
                      setEditNameInput(n);
                    }}
                    onCancelEdit={() => setEditingTag(null)}
                    onSaveEdit={handleSaveEdit}
                    onDeleteTag={async (t) => {
                      if (confirm(`Delete tag "${t}" globally from all videos?`)) {
                        await deleteTag(t);
                      }
                    }}
                    onEditCatChange={setEditCatInput}
                    onEditNameChange={setEditNameInput}
                  />
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
            className="border-border bg-surface text-muted hover:border-primary-border/40 hover:text-foreground cursor-pointer rounded-lg border px-4 py-1.5 text-xs font-semibold shadow-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
