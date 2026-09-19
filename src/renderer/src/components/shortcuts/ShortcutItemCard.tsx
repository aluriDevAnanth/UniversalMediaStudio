import React from "react";
import { ShortcutItem } from "./shortcutsData";

export interface ShortcutItemCardProps {
  shortcut: ShortcutItem;
}

export const ShortcutItemCard: React.FC<ShortcutItemCardProps> = ({ shortcut }) => {
  return (
    <div className="border-border bg-surface-hover/30 hover:border-primary/40 hover:bg-surface-hover/70 flex items-center justify-between gap-3 rounded-xl border p-3 transition">
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-foreground">
          {shortcut.label}
        </div>
        {shortcut.description && (
          <div className="text-muted mt-0.5 line-clamp-1 text-[11px]">
            {shortcut.description}
          </div>
        )}
      </div>

      {/* KBD Badges */}
      <div className="flex shrink-0 items-center gap-1">
        {shortcut.keys.map((k, kIndex) => (
          <kbd
            key={kIndex}
            className="border-border bg-background text-foreground shadow-xs inline-flex min-w-[24px] items-center justify-center rounded-md border px-2 py-1 font-mono text-[11px] font-bold tracking-wide"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
};
