import React from "react";

export const PRESET_TAG_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#6366f1", // Indigo
  "#84cc16", // Lime
  "#14b8a6", // Teal
];

export interface ParsedTag {
  category: string;
  name: string;
  full: string;
}

/**
 * Parses raw tag string into category and name.
 * e.g. "Genre:Action" -> { category: "Genre", name: "Action", full: "Genre:Action" }
 * e.g. "Action" -> { category: "General", name: "Action", full: "General:Action" }
 */
export function parseTag(rawTag: string): ParsedTag {
  if (!rawTag) {
    return { category: "General", name: "", full: "General:" };
  }
  const parts = rawTag.split(":");
  if (parts.length >= 2) {
    const category = parts[0].trim() || "General";
    const name = parts.slice(1).join(":").trim();
    return {
      category,
      name,
      full: `${category}:${name}`,
    };
  }
  return {
    category: "General",
    name: rawTag.trim(),
    full: `General:${rawTag.trim()}`,
  };
}

export function formatTag(category: string, name: string): string {
  const cat = (category || "").trim() || "General";
  const nm = (name || "").trim();
  return `${cat}:${nm}`;
}

export function getCategoryColor(
  categoryName: string,
  categoryColorsMap?: Record<string, string>,
): string {
  const cat = (categoryName || "General").trim();
  if (categoryColorsMap && categoryColorsMap[cat]) {
    return categoryColorsMap[cat];
  }
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_TAG_COLORS.length;
  return PRESET_TAG_COLORS[index];
}

export function getTagColor(
  rawTag: string,
  categoryColorsMap?: Record<string, string>,
): string {
  const { category } = parseTag(rawTag);
  return getCategoryColor(category, categoryColorsMap);
}

export function getTagStyle(colorHex: string) {
  return {
    backgroundColor: `${colorHex}1b`, // 10% opacity
    borderColor: `${colorHex}40`,     // 25% opacity
    color: colorHex,
  };
}

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query,
  className = "",
}) => {
  const q = query ? query.trim() : "";
  if (!q || !text) {
    return React.createElement("span", { className }, text);
  }

  // Handle category search syntax e.g. #Genre:Action or #Genre
  let cleanQuery = q;
  if (cleanQuery.startsWith("#")) {
    cleanQuery = cleanQuery.slice(1);
    if (cleanQuery.includes(":")) {
      cleanQuery = cleanQuery.split(":").pop() || "";
    }
  }

  if (!cleanQuery) {
    return React.createElement("span", { className }, text);
  }

  const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  const children = parts.map((part, i) =>
    part.toLowerCase() === cleanQuery.toLowerCase()
      ? React.createElement(
          "mark",
          {
            key: i,
            className: "rounded bg-amber-400/35 px-0.5 font-bold text-amber-200",
          },
          part,
        )
      : part,
  );

  return React.createElement("span", { className }, ...children);
};
