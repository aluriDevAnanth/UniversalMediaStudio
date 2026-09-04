import React, { useRef, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  Tag,
  ChevronDown,
  X,
  Search,
  Check,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { parseTag, formatTag, getCategoryColor } from "../utils/tagColors";
import { TagBadge } from "./TagBadge";

interface TagDropdownProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  mode?: "filter" | "editor";
  className?: string;
}

export const TagDropdown: React.FC<TagDropdownProps> = ({
  selectedTags,
  onChange,
  placeholder,
  mode = "filter",
  className = "",
}) => {
  const { tags, categoryColors, tagMatchMode, setTagMatchMode, addTag } =
    useVideoStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTagQuery, setSearchTagQuery] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newCatInputValue, setNewCatInputValue] = useState("General");
  const [newNameInputValue, setNewNameInputValue] = useState("");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const [portalCoords, setPortalCoords] = useState<{
    top: number;
    left: number;
  }>({
    top: 0,
    left: 0,
  });

  // Dynamic attachment coordinates anchored to trigger button
  useEffect(() => {
    if (!dropdownOpen || !triggerRef.current) return;

    const updateCoords = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const panelHeight = 340;
      const panelWidth = 280;

      let top = rect.bottom + 6;
      if (
        window.innerHeight - rect.bottom < panelHeight &&
        rect.top > panelHeight
      ) {
        top = Math.max(10, rect.top - panelHeight - 6);
      }

      let left = rect.left;
      if (window.innerWidth - rect.left < panelWidth) {
        left = Math.max(10, rect.right - panelWidth);
      }

      setPortalCoords({ top, left });
    };

    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [dropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter tags based on search input (supports `#` syntax: #Category or #Category:Tag)
  const filteredTags = [...tags]
    .sort((a, b) => a.localeCompare(b))
    .filter((t) => {
      if (!searchTagQuery) return true;
      const q = searchTagQuery.trim();

      if (q.startsWith("#")) {
        const clean = q.slice(1);
        if (clean.includes(":")) {
          const [catSearch, tagSearch] = clean.split(":");
          const { category, name } = parseTag(t);
          const matchesCat = category
            .toLowerCase()
            .includes(catSearch.toLowerCase());
          const matchesTag = name
            .toLowerCase()
            .includes(tagSearch.toLowerCase());
          return matchesCat && matchesTag;
        } else {
          const { category } = parseTag(t);
          return category.toLowerCase().includes(clean.toLowerCase());
        }
      }

      const { category, name } = parseTag(t);
      const textSearch = `${category} ${name}`.toLowerCase();
      return textSearch.includes(q.toLowerCase());
    });

  // Group tags for display
  const groupedFilteredTags: Record<string, string[]> = {};
  for (const t of filteredTags) {
    const { category } = parseTag(t);
    if (!groupedFilteredTags[category]) {
      groupedFilteredTags[category] = [];
    }
    groupedFilteredTags[category].push(t);
  }

  // Truncation logic for filter mode trigger pill display
  const getVisibleSelectedTags = () => {
    let currentLength = 0;
    const visible: string[] = [];
    const maxLength = 24;

    for (const t of selectedTags) {
      if (currentLength + t.length + 2 > maxLength) {
        break;
      }
      visible.push(t);
      currentLength += t.length + 2;
    }
    const remaining = selectedTags.length - visible.length;
    return { visible, remaining };
  };

  const { visible: visibleSelected, remaining: remainingSelected } =
    getVisibleSelectedTags();

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* Trigger Button - Mode Specific */}
      {mode === "editor" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedTags.map((t) => (
            <TagBadge
              key={t}
              rawTag={t}
              size="sm"
              onRemove={() => onChange(selectedTags.filter((tag) => tag !== t))}
            />
          ))}

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="border-border hover:border-primary/50 bg-surface hover:bg-surface-hover text-muted hover:text-foreground inline-flex cursor-pointer items-center gap-1 rounded-lg border border-dashed px-2 py-1 text-xs font-semibold transition"
          >
            <Plus className="h-3 w-3" />
            <span>Add Tag</span>
          </button>
        </div>
      ) : (
        /* Filter mode trigger */
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className={`flex max-w-[280px] cursor-pointer items-center gap-2 overflow-hidden rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
            selectedTags.length > 0
              ? "bg-primary/15 text-primary-text border-primary-border/40 border"
              : "bg-background text-muted hover:text-foreground hover:bg-surface-hover border-border border"
          }`}
        >
          <Tag className="h-3.5 w-3.5 shrink-0" />

          {selectedTags.length === 0 ? (
            <span className="truncate">{placeholder || "All Tags"}</span>
          ) : (
            <div className="flex items-center gap-1 truncate overflow-hidden">
              {visibleSelected.map((t) => (
                <TagBadge key={t} rawTag={t} size="xs" />
              ))}
              {remainingSelected > 0 && (
                <span className="text-primary-text bg-primary/20 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold">
                  +{remainingSelected}
                </span>
              )}
            </div>
          )}

          {selectedTags.length > 0 ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="hover:bg-primary/20 ml-1.5 shrink-0 cursor-pointer rounded p-0.5"
              title="Clear tags"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown
              className={`ml-1.5 h-3 w-3 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          )}
        </button>
      )}

      {/* Render Dropdown via React Portal */}
      {dropdownOpen &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: portalCoords.top,
              left: portalCoords.left,
              width: 280,
              zIndex: 9999,
            }}
            className="bg-surface border-border animate-fade-in flex flex-col overflow-hidden rounded-xl border shadow-2xl"
          >
            {/* Search Bar */}
            <div className="border-border bg-background/40 flex flex-col gap-1.5 border-b p-2">
              <div className="flex items-center justify-between gap-1.5">
                <div className="relative flex-1">
                  <Search className="text-muted pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTagQuery}
                    onChange={(e) => setSearchTagQuery(e.target.value)}
                    placeholder="Search or #Category:Tag..."
                    className="bg-background border-border text-foreground focus:border-primary placeholder-muted/60 w-full rounded-lg border py-1 pr-6 pl-8 text-xs focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  {searchTagQuery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTagQuery("");
                      }}
                      className="text-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {selectedTags.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange([]);
                    }}
                    className="text-primary-text shrink-0 cursor-pointer text-[10px] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Boolean Match Mode Switcher (ANY vs ALL) - in filter mode */}
              {mode === "filter" && selectedTags.length > 1 && (
                <div className="bg-surface border-border/60 flex items-center justify-between rounded-lg border p-1 text-[10px]">
                  <span className="text-muted flex items-center gap-1 pl-1 font-medium">
                    <SlidersHorizontal className="text-primary-text h-3 w-3" />
                    Match Mode:
                  </span>
                  <div className="bg-background border-border/40 flex rounded border p-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagMatchMode("ANY");
                      }}
                      className={`cursor-pointer rounded px-2 py-0.5 font-bold transition ${
                        tagMatchMode === "ANY"
                          ? "bg-primary text-white shadow"
                          : "text-muted hover:text-foreground"
                      }`}
                      title="Show videos matching AT LEAST ONE tag"
                    >
                      ANY (OR)
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagMatchMode("ALL");
                      }}
                      className={`cursor-pointer rounded px-2 py-0.5 font-bold transition ${
                        tagMatchMode === "ALL"
                          ? "bg-primary text-white shadow"
                          : "text-muted hover:text-foreground"
                      }`}
                      title="Show videos matching ALL selected tags"
                    >
                      ALL (AND)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tag List Grouped by Category */}
            <div
              ref={listContainerRef}
              className="max-h-60 flex-1 space-y-2.5 overflow-y-auto px-1.5 py-2"
            >
              {Object.keys(groupedFilteredTags).length === 0 ? (
                <div className="text-muted px-3 py-6 text-center text-xs">
                  <p>No tags found.</p>
                  <p className="mt-1 text-[10px]">Click "+" below to create one.</p>
                </div>
              ) : (
                Object.keys(groupedFilteredTags).map((cat) => {
                  const catColor = getCategoryColor(cat, categoryColors);
                  const catTags = groupedFilteredTags[cat];

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="text-muted flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: catColor }}
                        />
                        {cat}
                      </div>

                      <div className="flex flex-col gap-0.5">
                        {catTags.map((t) => {
                          const checked = selectedTags.includes(t);

                          return (
                            <div
                              key={t}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTag(t);
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs transition ${
                                checked
                                  ? "bg-primary/15 text-primary-text font-semibold"
                                  : "text-foreground hover:bg-surface-hover"
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition ${
                                    checked
                                      ? "bg-primary text-white"
                                      : "bg-background border-border border"
                                  }`}
                                >
                                  {checked && <Check className="h-3 w-3" />}
                                </span>

                                <TagBadge
                                  rawTag={t}
                                  size="sm"
                                  showDot
                                  searchQuery={searchTagQuery}
                                  selected={checked}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Quick Add Tag Row */}
              {isAddingTag && (
                <div className="border-border bg-background/70 animate-in fade-in flex flex-col gap-1.5 rounded-lg border p-2 duration-150">
                  <div className="flex w-full items-center justify-between">
                    <div className="text-muted text-[10px] font-bold uppercase">
                      Create New Tag
                    </div>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const cat = newCatInputValue.trim() || "General";
                        const nm = newNameInputValue.trim();
                        if (nm) {
                          const formatted = formatTag(cat, nm);
                          await addTag(formatted);
                          onChange([...selectedTags, formatted]);
                          setNewNameInputValue("");
                        }
                        setIsAddingTag(false);
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
                      onChange={(e) => setNewCatInputValue(e.target.value)}
                      placeholder="Category"
                      className="bg-surface border-border text-foreground w-20 rounded-md border px-2 py-1 text-xs focus:outline-none"
                    />
                    <span className="text-muted text-xs font-bold">:</span>
                    <input
                      type="text"
                      value={newNameInputValue}
                      onChange={(e) => setNewNameInputValue(e.target.value)}
                      placeholder="Tag Name"
                      autoFocus
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          const cat = newCatInputValue.trim() || "General";
                          const nm = newNameInputValue.trim();
                          if (nm) {
                            const formatted = formatTag(cat, nm);
                            await addTag(formatted);
                            onChange([...selectedTags, formatted]);
                            setNewNameInputValue("");
                          }
                          setIsAddingTag(false);
                        } else if (e.key === "Escape") {
                          e.stopPropagation();
                          setIsAddingTag(false);
                        }
                      }}
                      className="bg-surface border-border text-foreground flex-1 rounded-md border px-2 py-1 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-border bg-background/40 flex items-center justify-between border-t px-3 py-2">
              <span className="text-muted text-[10px] font-medium">
                {selectedTags.length} of {tags.length} selected
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingTag((prev) => !prev);
                }}
                className="hover:bg-primary/15 text-primary-text flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition"
                title="Create a new tag"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Tag</span>
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
