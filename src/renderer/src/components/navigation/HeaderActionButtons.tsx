import React from "react";
import { Upload, Keyboard, Sun, Moon, Lock } from "lucide-react";

export interface HeaderActionButtonsProps {
  theme: "dark" | "light";
  onImport: () => void;
  onToggleShortcuts: () => void;
  onToggleTheme: () => void;
  onLockApp: () => void;
}

export const HeaderActionButtons: React.FC<HeaderActionButtonsProps> = ({
  theme,
  onImport,
  onToggleShortcuts,
  onToggleTheme,
  onLockApp,
}) => {
  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
      <button
        onClick={onImport}
        title="Import Video File (Ctrl+O)"
        className="hover:bg-primary/90 bg-primary hidden md:flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
      >
        <Upload className="h-3.5 w-3.5" />
        <span>Import</span>
      </button>

      {/* Shortcuts cheatsheet button */}
      <button
        onClick={onToggleShortcuts}
        title="Keyboard Shortcuts (? or Ctrl+/)"
        className="glass-pill text-muted hover:bg-surface-hover hover:text-foreground hidden sm:flex cursor-pointer rounded-xl p-1.5 transition shadow-2xs"
      >
        <Keyboard className="h-3.5 w-3.5" />
      </button>

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        title={
          theme === "dark"
            ? "Switch to Light Mode (Ctrl+D)"
            : "Switch to Dark Mode (Ctrl+D)"
        }
        className="glass-pill text-muted hover:bg-surface-hover hover:text-foreground cursor-pointer rounded-xl p-1.5 transition shadow-2xs"
      >
        {theme === "dark" ? (
          <Sun className="h-3.5 w-3.5 animate-pulse text-amber-500" />
        ) : (
          <Moon className="h-3.5 w-3.5 text-blue-600" />
        )}
      </button>

      {/* Lock App Button */}
      <button
        onClick={onLockApp}
        title="Lock Studio (Ctrl+L)"
        className="glass-pill text-muted hover:border-primary-border/40 hover:bg-primary/10 hover:text-primary-text flex cursor-pointer items-center gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-semibold transition"
      >
        <Lock className="h-3.5 w-3.5" />
        <span className="hidden lg:inline text-[11px]">Lock</span>
      </button>
    </div>
  );
};
