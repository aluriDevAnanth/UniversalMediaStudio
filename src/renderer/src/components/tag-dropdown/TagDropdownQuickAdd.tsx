import React from "react";

export interface TagDropdownQuickAddProps {
  isVisible: boolean;
  newCatInputValue: string;
  newNameInputValue: string;
  onCatChange: (val: string) => void;
  onNameChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const TagDropdownQuickAdd: React.FC<TagDropdownQuickAddProps> = ({
  isVisible,
  newCatInputValue,
  newNameInputValue,
  onCatChange,
  onNameChange,
  onSave,
  onCancel,
}) => {
  if (!isVisible) return null;

  return (
    <div className="border-border bg-background/70 animate-in fade-in flex flex-col gap-1.5 rounded-lg border p-2 duration-150">
      <div className="flex w-full items-center justify-between">
        <div className="text-muted text-[10px] font-bold uppercase">
          Create New Tag
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className="bg-primary hover:bg-primary-hover cursor-pointer rounded px-2 py-0.5 text-xs font-bold text-white shadow-xs"
        >
          Save
        </button>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={newCatInputValue}
          onChange={(e) => onCatChange(e.target.value)}
          placeholder="Category"
          className="bg-surface border-border text-foreground w-20 rounded-md border px-2 py-1 text-xs focus:outline-none"
        />
        <span className="text-muted text-xs font-bold">:</span>
        <input
          type="text"
          value={newNameInputValue}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Tag Name"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onSave();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              onCancel();
            }
          }}
          className="bg-surface border-border text-foreground flex-1 rounded-md border px-2 py-1 text-xs font-semibold focus:outline-none"
        />
      </div>
    </div>
  );
};
