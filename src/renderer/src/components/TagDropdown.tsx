import React, { useRef, useState, useEffect } from "react";
import {
  Tag,
  ChevronDown,
  X,
  Search,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";

interface TagDropdownProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export const TagDropdown: React.FC<TagDropdownProps> = ({
  selectedTags,
  onChange,
  placeholder,
}) => {
  const {
    tags,
    addTag,
    deleteTag,
    renameTag,
  } = useVideoStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTagQuery, setSearchTagQuery] = useState("");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInputValue, setNewTagInputValue] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  const [positionClass, setPositionClass] = useState("top-full left-0 mt-1.5");

  // Calculate dropdown placement based on viewport space to avoid scrollbars
  useEffect(() => {
    if (!dropdownOpen || !dropdownRef.current) return;

    const calculatePosition = () => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const panelHeight = 280; // Estimated max height of dropdown panel
      const panelWidth = 240;  // width is w-60 (240px)

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.left;

      let vertical = "top-full mt-1.5";
      if (spaceBelow < panelHeight && spaceAbove > spaceBelow) {
        vertical = "bottom-full mb-1.5";
      }

      let horizontal = "left-0";
      if (spaceRight < panelWidth && rect.right > panelWidth) {
        horizontal = "right-0";
      }

      setPositionClass(`${vertical} ${horizontal}`);
    };

    calculatePosition();
    window.addEventListener("resize", calculatePosition);
    return () => window.removeEventListener("resize", calculatePosition);
  }, [dropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll to bottom when showing the new tag input
  useEffect(() => {
    if (isAddingTag && listContainerRef.current) {
      listContainerRef.current.scrollTop = listContainerRef.current.scrollHeight;
      setTimeout(() => {
        newTagInputRef.current?.focus();
      }, 50);
    }
  }, [isAddingTag]);

  // Truncation logic for selectedTags inside trigger button:
  const getVisibleSelectedTags = () => {
    let currentLength = 0;
    const visible: string[] = [];
    const maxLength = 22; // Limit visible text length in pills
    
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

  const { visible: visibleSelected, remaining: remainingSelected } = getVisibleSelectedTags();

  // Filter & Sort tags
  const filteredTags = [...tags]
    .sort((a, b) => a.localeCompare(b))
    .filter((t) => t.toLowerCase().includes(searchTagQuery.toLowerCase()));

  return (
    <div ref={dropdownRef} className="relative shrink-0">
      {/* Trigger Button */}
      <button
        onClick={() => setDropdownOpen((o) => !o)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer max-w-[280px] overflow-hidden ${
          selectedTags.length > 0
            ? "bg-primary/15 text-primary-text"
            : "bg-background text-muted hover:text-foreground hover:bg-surface-hover border border-border"
        }`}
      >
        <Tag className="w-3.5 h-3.5 shrink-0" />
        
        {selectedTags.length === 0 ? (
          <span className="truncate">{placeholder || "All Tags"}</span>
        ) : (
          <div className="flex items-center gap-1 overflow-hidden truncate">
            {visibleSelected.map((t) => (
              <span key={t} className="bg-primary/10 px-1.5 py-0.5 rounded text-[10px] shrink-0 font-semibold text-primary-text">
                #{t}
              </span>
            ))}
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
            title="Clear tag filters"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown
            className={`w-3 h-3 transition-transform shrink-0 ml-1.5 ${dropdownOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Dropdown panel */}
      {dropdownOpen && (
        <div className={`absolute z-50 w-60 bg-surface border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in flex flex-col ${positionClass}`}>
          {/* Search tags input replacing header */}
          <div className="p-2 border-b border-border flex items-center justify-between bg-background/30 gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchTagQuery}
                onChange={(e) => setSearchTagQuery(e.target.value)}
                placeholder="Search tags..."
                className="w-full pl-8 pr-6 py-1 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary placeholder-muted/60"
                onClick={(e) => e.stopPropagation()}
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
                Clear all
              </button>
            )}
          </div>

          {/* Tag options list */}
          <div ref={listContainerRef} className="max-h-56 overflow-y-auto py-1 flex-1">
            {filteredTags.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted">
                No tags found.
              </div>
            ) : (
              filteredTags.map((t) => {
                const checked = selectedTags.includes(t);
                const isEditing = editingTag === t;
                return (
                  <div
                    key={t}
                    className={`group w-full flex items-center justify-between px-3 py-1.5 text-xs transition ${
                      checked
                        ? "text-primary-text bg-primary/5"
                        : "text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={(e) => isEditing && e.stopPropagation()}>
                      {/* Custom checkbox */}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isEditing) {
                            if (checked) {
                              onChange(selectedTags.filter((tag) => tag !== t));
                            } else {
                              onChange([...selectedTags, t]);
                            }
                          }
                        }}
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition cursor-pointer ${
                          checked
                            ? "bg-primary text-white"
                            : "bg-background border border-border"
                        }`}
                      >
                        {checked && <Check className="w-2.5 h-2.5" />}
                      </span>
                      
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingValue}
                          autoFocus
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              const trimmed = editingValue.trim();
                              if (trimmed && trimmed !== t) {
                                await renameTag(t, trimmed);
                              }
                              setEditingTag(null);
                            } else if (e.key === "Escape") {
                              e.stopPropagation();
                              setEditingTag(null);
                            }
                          }}
                          onBlur={async () => {
                            const trimmed = editingValue.trim();
                            if (trimmed && trimmed !== t) {
                              await renameTag(t, trimmed);
                            }
                            setEditingTag(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          className="w-full text-xs bg-background border border-primary px-1 py-0.5 rounded text-foreground focus:outline-none"
                        />
                      ) : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTag(t);
                            setEditingValue(t);
                          }}
                          className="font-medium truncate select-none cursor-text flex-1 py-0.5 hover:text-primary-text"
                          title="Click to edit tag name"
                        >
                          #{t}
                        </span>
                      )}
                    </div>

                    {/* Delete action button, hide when editing */}
                    {!isEditing && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Delete tag #${t} globally?`)) {
                            await deleteTag(t);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-muted hover:text-rose-500 rounded transition cursor-pointer shrink-0 ml-1.5"
                        title="Delete tag globally"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {/* Add Tag Inline Row */}
            {isAddingTag && (
              <div className="px-3 py-1.5 border-t border-border/40 bg-background/20 flex gap-1.5 items-center">
                <input
                  ref={newTagInputRef}
                  type="text"
                  value={newTagInputValue}
                  onChange={(e) => setNewTagInputValue(e.target.value)}
                  placeholder="Add tag..."
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      const trimmed = newTagInputValue.trim();
                      if (trimmed) {
                        await addTag(trimmed);
                        onChange([...selectedTags, trimmed]);
                        setNewTagInputValue("");
                      }
                      setIsAddingTag(false);
                    } else if (e.key === "Escape") {
                      e.stopPropagation();
                      setIsAddingTag(false);
                      setNewTagInputValue("");
                    }
                  }}
                  onBlur={async () => {
                    const trimmed = newTagInputValue.trim();
                    if (trimmed) {
                      await addTag(trimmed);
                      onChange([...selectedTags, trimmed]);
                      setNewTagInputValue("");
                    }
                    setIsAddingTag(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:border-primary"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingTag(false);
                    setNewTagInputValue("");
                  }}
                  className="p-0.5 text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Footer with selection count and Add button */}
          <div className="px-3 py-1.5 border-t border-border bg-background/40 flex items-center justify-between">
            <span className="text-[10px] text-muted font-medium">
              {selectedTags.length} of {tags.length} selected
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingTag(true);
              }}
              className="p-1 hover:bg-primary/10 text-primary-text rounded-lg transition cursor-pointer flex items-center justify-center"
              title="Add new tag"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
