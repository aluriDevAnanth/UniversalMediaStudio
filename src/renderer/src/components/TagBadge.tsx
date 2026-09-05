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

  const sizeClasses =
    size === "xs"
      ? "text-[8px] gap-0.5 rounded"
      : size === "md"
        ? "text-[11px] gap-1.5 rounded-md"
        : "text-[9px] gap-1 rounded-md";

  const iconSizeClasses = size === "xs" ? "w-2 h-2" : "w-2.5 h-2.5";

  let style: React.CSSProperties = {};
  let variantClass = "";

  if (variant === "solid") {
    style = {
      backgroundColor: "transparent",
      color: "#ffffff",
    };
    variantClass = "shadow-xs font-semibold";
  } else if (variant === "outline") {
    style = {
      backgroundColor: "transparent",
      color: color,
    };
    variantClass = "border font-medium";
  } else {
    // subtle (default)
    const baseStyle = getTagStyle(color);
    style = {
      color: baseStyle.color,
    };
    variantClass = `  font-semibold ${selected ? "ring-1" : ""}`;
  }

  const isClickable = !!onClick;
  const isGeneral = category === "General";

  return (
    <span
      style={style}
      onClick={onClick}
      title={title || full}
      className={`inline-flex items-center transition-all duration-150 select-none ${sizeClasses} ${variantClass} ${
        isClickable ? "cursor-pointer hover:brightness-110 active:scale-95" : ""
      } ${className}`}
    >
      {showDot && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full shadow-xs"
          style={{ backgroundColor: color }}
        />
      )}

      {showIcon && <TagIcon className={`shrink-0 ${iconSizeClasses}`} />}

      <span className="flex items-center gap-0.5 truncate">
        {showCategory && !isGeneral && (
          <>
            <span className="font-normal opacity-75">
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
          className="-mr-0.5 ml-0.5 shrink-0 cursor-pointer rounded-full p-0.5 opacity-60 transition hover:bg-black/20 hover:opacity-100 dark:hover:bg-white/20"
        >
          <X className={iconSizeClasses} />
        </button>
      )}
    </span>
  );
};
