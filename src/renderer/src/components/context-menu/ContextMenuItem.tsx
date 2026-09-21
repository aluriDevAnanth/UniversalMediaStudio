import React from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";

export interface ContextMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  hasExpand?: boolean;
  expanded?: boolean;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  icon,
  label,
  onClick,
  danger = false,
  active = false,
  hasExpand = false,
  expanded = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-left text-xs transition ${
        danger
          ? "text-rose-500 hover:bg-rose-500/10"
          : active
            ? "bg-primary/8 hover:bg-primary/15 text-primary-text"
            : "text-foreground hover:bg-surface-hover"
      }`}
    >
      <span
        className={`shrink-0 ${
          danger
            ? "text-rose-500"
            : active
              ? "text-primary-text"
              : "text-muted group-hover:text-foreground"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 truncate font-medium">{label}</span>
      {hasExpand && (
        <span className="shrink-0 text-muted">
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </span>
      )}
      {active && !hasExpand && (
        <Check className="h-3 w-3 shrink-0 text-primary-text" />
      )}
    </button>
  );
};
