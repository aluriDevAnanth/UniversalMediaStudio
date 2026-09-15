import React from "react";
import { Trash2 } from "lucide-react";
import { PRESET_TAG_COLORS } from "../../utils/tagColors";
import { parseTag } from "../../utils/tagColors";
import { TagItemChip } from "./TagItemChip";
import { TagInlineEditor } from "./TagInlineEditor";

export interface TagCategoryCardProps {
  category: string;
  catColor: string;
  allCatTags: string[];
  catTags: string[];
  selectedTags: string[];
  editingTag: string | null;
  editCatInput: string;
  editNameInput: string;
  videos: any[];
  onToggleCategoryTags: (cTags: string[]) => void;
  onSetCategoryColor: (category: string, color: string) => void;
  onDeleteCategory: (category: string, allCatTags: string[]) => void;
  onStartEdit: (tag: string, cat: string, name: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (oldTag: string) => void;
  onDeleteTag: (tag: string) => void;
  onEditCatChange: (val: string) => void;
  onEditNameChange: (val: string) => void;
}

export const TagCategoryCard: React.FC<TagCategoryCardProps> = ({
  category,
  catColor,
  allCatTags,
  catTags,
  selectedTags,
  editingTag,
  editCatInput,
  editNameInput,
  videos,
  onToggleCategoryTags,
  onSetCategoryColor,
  onDeleteCategory,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteTag,
  onEditCatChange,
  onEditNameChange,
}) => {
  const isAllSelected =
    allCatTags.length > 0 && allCatTags.every((t) => selectedTags.includes(t));
  const isSomeSelected =
    allCatTags.some((t) => selectedTags.includes(t)) && !isAllSelected;

  return (
    <div className="group/cat border-border bg-surface hover:bg-surface-hover/30 rounded-xl border p-2.5 shadow-xs transition">
      {/* Category Header Row */}
      <div className="border-border flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          {/* Category Bulk Checkbox */}
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isSomeSelected;
            }}
            onChange={() => onToggleCategoryTags(allCatTags)}
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
            className="h-3 w-3 shrink-0 rounded-full shadow-xs ring-1 ring-white/20"
          />

          <h3 className="text-foreground text-xs font-bold tracking-wider uppercase">
            {category}
          </h3>

          <span className="text-foreground/80 bg-background border-border rounded-full border px-2 py-0.5 text-[10px] font-semibold">
            {allCatTags.length} tag
            {allCatTags.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Category Palette & Delete Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {PRESET_TAG_COLORS.slice(0, 6).map((c) => (
              <button
                key={c}
                onClick={() => onSetCategoryColor(category, c)}
                style={{ backgroundColor: c }}
                className={`h-3 w-3 cursor-pointer rounded-full transition-transform ${
                  catColor === c
                    ? "ring-1.5 scale-125 ring-white"
                    : "opacity-40 hover:scale-110 hover:opacity-100"
                }`}
                title={`Set ${category} color to ${c}`}
              />
            ))}
          </div>

          <button
            onClick={() => onDeleteCategory(category, allCatTags)}
            title={`Delete category "${category}" and its tags`}
            className="text-muted cursor-pointer rounded p-1 transition hover:bg-rose-500/15 hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tags Wrapped Chips */}
      <div className="flex flex-wrap gap-1.5 pt-2">
        {catTags.map((t) => {
          const { category: cName, name: tName } = parseTag(t);
          const isEditing = editingTag === t;
          const videoCount = videos.filter((v) =>
            v.tags?.includes(t),
          ).length;

          if (isEditing) {
            return (
              <TagInlineEditor
                key={t}
                editCatInput={editCatInput}
                editNameInput={editNameInput}
                onEditCatChange={onEditCatChange}
                onEditNameChange={onEditNameChange}
                onSave={() => onSaveEdit(t)}
                onCancel={onCancelEdit}
              />
            );
          }

          return (
            <TagItemChip
              key={t}
              tag={t}
              videoCount={videoCount}
              onEdit={() => onStartEdit(t, cName, tName)}
              onDelete={() => onDeleteTag(t)}
            />
          );
        })}
      </div>
    </div>
  );
};
