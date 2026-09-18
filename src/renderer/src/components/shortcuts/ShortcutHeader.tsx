import React from "react";
import { Keyboard, X } from "lucide-react";

export interface ShortcutHeaderProps {
  onClose: () => void;
}

export const ShortcutHeader: React.FC<ShortcutHeaderProps> = ({ onClose }) => {
  return (
    <div className="border-border flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="border-primary-border/40 bg-primary/15 text-primary-text flex h-10 w-10 items-center justify-center rounded-xl border shadow-inner">
          <Keyboard className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">
            Keyboard Shortcuts
          </h2>
          <p className="text-muted text-xs">
            Master UniversalMediaStudio with powerful keyboard controls
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-xl p-2 transition"
        title="Close (Esc)"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};
