import React from "react";
import { X, Tag as TagIcon } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import {
  parseTag,
  getCategoryColor,
  getTagStyle,
  HighlightText,
} from "../utils/tagColors";

export interface TagBadgeProps {
  rawTag: string;
  categoryColors?: Record<string, string>;
  size?: "xs" | "sm" | "md";
  variant?: "subtle" | "solid" | "outline";
  showCategory?: boolean;
  showDot?: boolean;
  showIcon?: boolean;
  onRemove?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  searchQuery?: string;
  selected?: boolean;
  className?: string;
  title?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  rawTag,
  categoryColors: customCategoryColors,
  size = "sm",
  variant = "subtle",
  showCategory = true,
  showDot = false,
  showIcon = false,
  onRemove,
  onClick,
  searchQuery = "",
  selected,
  className = "",
  title,
}) => {
  const storeCategoryColors = useVideoStore((s) => s.categoryColors);
  const categoryColors = customCategoryColors || storeCategoryColors;

  const { category, name, full } = parseTag(rawTag);
  const color = getCategoryColor(category, categoryColors);

  // Size specifications
  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5 gap-1 rounded-md",
    sm: "text-[11px] px-2 py-0.5 gap-1.5 rounded-lg",
    md: "text-xs px-2.5 py-1 gap-2 rounded-xl",
  }[size];

  const dotSizeClasses = {
    xs: "w-1 h-1",
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
  }[size];

  const iconSizeClasses = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
  }[size];

  // Dynamic color styling based on variant
  let style: React.CSSProperties = {};
  let variantClass = "";

  if (variant === "solid") {
    style = {
      backgroundColor: color,
      borderColor: color,
      color: "#ffffff",
    };
    variantClass = "shadow-xs font-semibold";
  } else if (variant === "outline") {
    style = {
      backgroundColor: "transparent",
      borderColor: color,
      color: color,
    };
    variantClass = "border font-medium";
  } else {
    // subtle (default)
    const baseStyle = getTagStyle(color);
    style = {
      backgroundColor: selected ? `${color}35` : baseStyle.backgroundColor,
      borderColor: selected ? color : baseStyle.borderColor,
      color: baseStyle.color,
    };
    variantClass = `border font-semibold ${selected ? "ring-1" : ""}`;
  }

  const isClickable = !!onClick;
  const isGeneral = category === "General";

  return (
    <span
      style={style}
      onClick={onClick}
      title={title || full}
      className={`inline-flex items-center select-none transition-all duration-150 ${sizeClasses} ${variantClass} ${
        isClickable
          ? "cursor-pointer hover:brightness-110 active:scale-95"
          : ""
      } ${className}`}
    >
      {showDot && (
        <span
          className={`shrink-0 rounded-full ${dotSizeClasses}`}
          style={{ backgroundColor: color }}
        />
      )}

      {showIcon && <TagIcon className={`shrink-0 ${iconSizeClasses}`} />}

      <span className="flex items-center gap-0.5 truncate">
        {showCategory && !isGeneral && (
          <>
            <span className="opacity-75 font-normal">
              <HighlightText text={category} query={searchQuery} />:
            </span>
          </>
        )}
        <span className="font-bold">
          <HighlightText text={name} query={searchQuery} />
        </span>
      </span>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          title={`Remove tag ${name}`}
          className="ml-0.5 shrink-0 -mr-0.5 cursor-pointer rounded-full p-0.5 opacity-60 transition hover:bg-black/20 hover:opacity-100 dark:hover:bg-white/20"
        >
          <X className={iconSizeClasses} />
        </button>
      )}
    </span>
  );
};
