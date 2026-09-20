import React from "react";
import { LucideIcon } from "lucide-react";

export interface SidebarNavItemProps {
  id: string;
  icon: LucideIcon;
  label: string;
  shortcut: string;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  icon: Icon,
  label,
  shortcut,
  isActive,
  isExpanded,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      title={`${label} (${shortcut})`}
      className={`flex h-9 w-full cursor-pointer items-center rounded-xl px-2.5 text-xs font-semibold transition-all duration-150 ${
        isExpanded ? "justify-between" : "justify-center px-0"
      } ${
        isActive
          ? "bg-primary/20 text-primary-text border-primary-border/40 border font-bold shadow-2xs backdrop-blur-md"
          : "text-muted hover:text-foreground hover:bg-surface-hover/70"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 shrink-0" />
        {isExpanded && <span className="truncate">{label}</span>}
      </div>
      {isExpanded && (
        <kbd className="border-border/80 bg-background/60 text-muted rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold">
          {shortcut.replace("Ctrl+", "^")}
        </kbd>
      )}
    </button>
  );
};
