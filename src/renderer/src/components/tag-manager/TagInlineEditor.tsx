import React from "react";
import { Check, X } from "lucide-react";

export interface TagInlineEditorProps {
  editCatInput: string;
  editNameInput: string;
  onEditCatChange: (val: string) => void;
  onEditNameChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const TagInlineEditor: React.FC<TagInlineEditorProps> = ({
  editCatInput,
  editNameInput,
  onEditCatChange,
  onEditNameChange,
  onSave,
  onCancel,
}) => {
  return (
    <div className="border-primary bg-background flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs shadow-md ring-1 ring-primary/40">
      <input
        type="text"
        value={editCatInput}
        onChange={(e) => onEditCatChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Category"
        className="text-foreground w-20 bg-transparent text-xs focus:outline-none"
      />
      <span className="text-muted font-bold">:</span>
      <input
        type="text"
        value={editNameInput}
        onChange={(e) => onEditNameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Tag Name"
        autoFocus
        className="text-foreground w-24 bg-transparent text-xs font-semibold focus:outline-none"
      />
      <button
        onClick={onSave}
        className="bg-primary hover:bg-primary-hover cursor-pointer rounded p-1 text-white transition"
        title="Save changes (Enter)"
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        onClick={onCancel}
        className="text-muted hover:text-foreground cursor-pointer p-1 transition"
        title="Cancel (Esc)"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};
