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
import {
  parseTag,
  formatTag,
  getCategoryColor,
  getTagStyle,
} from "../utils/tagColors";

interface TagDropdownProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  mode?: "filter" | "editor";
}

export const TagDropdown: React.FC<TagDropdownProps> = ({
  selectedTags,
  onChange,
  placeholder,
  mode = "filter",
}) => {
  const {
    tags,
    categoryColors,
    tagMatchMode,
    setTagMatchMode,
    addTag,
  } = useVideoStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTagQuery, setSearchTagQuery] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newCatInputValue, setNewCatInputValue] = useState("General");
  const [newNameInputValue, setNewNameInputValue] = useState("");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const [portalCoords, setPortalCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  // Dynamic attachment coordinates anchored to trigger button
  useEffect(() => {
    if (!dropdownOpen || !triggerRef.current) return;

    const updateCoords = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const panelHeight = 320;
      const panelWidth = 260;

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

  // Filter tags based on search input (supports browser `#` syntax: #Category or #Category:Tag)
  const filteredTags = [...tags].sort((a, b) => a.localeCompare(b)).filter((t) => {
    if (!searchTagQuery) return true;
    const q = searchTagQuery.trim();

    if (q.startsWith("#")) {
      const clean = q.slice(1);
      if (clean.includes(":")) {
        const [catSearch, tagSearch] = clean.split(":");
        const { category, name } = parseTag(t);
        const matchesCat = category.toLowerCase().includes(catSearch.toLowerCase());
        const matchesTag = name.toLowerCase().includes(tagSearch.toLowerCase());
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

  // Truncation logic for trigger pill display
  const getVisibleSelectedTags = () => {
    let currentLength = 0;
    const visible: string[] = [];
    const maxLength = 22;

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

  return (
    <div className="relative shrink-0">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setDropdownOpen((o) => !o)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer max-w-[280px] overflow-hidden ${
          selectedTags.length > 0
            ? "bg-primary/15 text-primary-text border border-primary-border/40"
            : "bg-background text-muted hover:text-foreground hover:bg-surface-hover border border-border"
        }`}
      >
        <Tag className="w-3.5 h-3.5 shrink-0" />

        {selectedTags.length === 0 ? (
          <span className="truncate">{placeholder || "Select tags..."}</span>
        ) : (
          <div className="flex items-center gap-1 overflow-hidden truncate">
            {visibleSelected.map((t) => {
              const { category, name } = parseTag(t);
              const color = getCategoryColor(category, categoryColors);
              const style = getTagStyle(color);
              return (
                <span
                  key={t}
                  style={style}
                  className="px-1.5 py-0.5 rounded text-[10px] shrink-0 font-semibold border"
                >
                  {category}:{name}
                </span>
              );
            })}
            {remainingSelected > 0 && (
              <span className="text-[10px] font-bold text-primary-text shrink-0 bg-primary/20 px-1.5 py-0.5 rounded">
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
            className="p-0.5 hover:bg-primary/20 rounded cursor-pointer shrink-0 ml-1.5"
            title="Clear tags"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown
            className={`w-3 h-3 transition-transform shrink-0 ml-1.5 ${dropdownOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Render Dropdown via React Portal */}
      {dropdownOpen &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: portalCoords.top,
              left: portalCoords.left,
              width: 270,
              zIndex: 9999,
            }}
            className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col"
          >
            {/* Search Bar */}
            <div className="p-2 border-b border-border flex flex-col gap-1.5 bg-background/40">
              <div className="flex items-center justify-between gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchTagQuery}
                    onChange={(e) => setSearchTagQuery(e.target.value)}
                    placeholder="Search or #Category:Tag..."
                    className="w-full pl-8 pr-6 py-1 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary placeholder-muted/60"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  {searchTagQuery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTagQuery("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {selectedTags.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange([]);
                    }}
                    className="text-[10px] text-primary-text hover:underline cursor-pointer shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Boolean Match Mode Switcher (ANY vs ALL) - in filter mode */}
              {mode === "filter" && selectedTags.length > 1 && (
                <div className="flex items-center justify-between bg-surface p-1 rounded-lg border border-border/60 text-[10px]">
                  <span className="flex items-center gap-1 text-muted font-medium pl-1">
                    <SlidersHorizontal className="w-3 h-3 text-primary-text" />
                    Match Mode:
                  </span>
                  <div className="flex bg-background rounded p-0.5 border border-border/40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagMatchMode("ANY");
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                        tagMatchMode === "ANY"
                          ? "bg-primary text-white shadow"
                          : "text-muted hover:text-foreground"
                      }`}
                      title="Show videos matching AT LEAST ONE tag"
                    >
                      ANY (OR)
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagMatchMode("ALL");
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
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
              className="max-h-56 overflow-y-auto py-1 flex-1 space-y-2 px-1"
            >
              {Object.keys(groupedFilteredTags).length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted">
                  No tags found.
                </div>
              ) : (
                Object.keys(groupedFilteredTags).map((cat) => {
                  const catColor = getCategoryColor(cat, categoryColors);
                  const catTags = groupedFilteredTags[cat];

                  return (
                    <div key={cat} className="space-y-0.5">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: catColor }}
                        />
                        {cat}
                      </div>

                      {catTags.map((t) => {
                        const checked = selectedTags.includes(t);
                        const { name } = parseTag(t);

                        return (
                          <div
                            key={t}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (checked) {
                                onChange(selectedTags.filter((tag) => tag !== t));
                              } else {
                                onChange([...selectedTags, t]);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                              checked
                                ? "text-primary-text bg-primary/10 font-bold"
                                : "text-foreground hover:bg-surface-hover"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition ${
                                  checked
                                    ? "bg-primary text-white"
                                    : "bg-background border border-border"
                                }`}
                              >
                                {checked && <Check className="w-2.5 h-2.5" />}
                              </span>

                              <span className="truncate">
                                {cat}:{name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}

              {/* Quick Add Tag Row */}
              {isAddingTag && (
                <div className="px-2 py-2 border-t border-border bg-background/50 flex flex-col gap-1.5">
                  <div className="text-[10px] font-bold text-muted uppercase">
                    Quick Create Tag
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newCatInputValue}
                      onChange={(e) => setNewCatInputValue(e.target.value)}
                      placeholder="Category"
                      className="w-20 text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none"
                    />
                    <span className="text-xs font-bold text-muted">:</span>
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
                      className="flex-1 text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none font-semibold"
                    />
                    <button
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
                      className="px-2 py-0.5 bg-primary text-white text-xs font-bold rounded hover:bg-primary-hover cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 border-t border-border bg-background/40 flex items-center justify-between">
              <span className="text-[10px] text-muted font-medium">
                {selectedTags.length} of {tags.length} selected
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingTag((prev) => !prev);
                }}
                className="p-1 hover:bg-primary/10 text-primary-text rounded-lg transition cursor-pointer flex items-center justify-center"
                title="Quick Add new tag"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
