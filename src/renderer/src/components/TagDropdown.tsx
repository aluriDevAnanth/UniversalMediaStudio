import React, { useRef, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Plus } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { parseTag, formatTag } from "../utils/tagColors";
import {
  TagDropdownEditorTrigger,
  TagDropdownFilterTrigger,
  TagDropdownSearchBar,
  TagDropdownList,
  TagDropdownQuickAdd,
} from "./tag-dropdown/index";

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

  useEffect(() => {
    if (!dropdownOpen || !triggerRef.current) return;

    const updateCoords = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const panelHeight = 340;
      const panelWidth = Math.min(280, window.innerWidth - 16);

      let top = rect.bottom + 6;
      if (
        window.innerHeight - rect.bottom < panelHeight &&
        rect.top > panelHeight
      ) {
        top = Math.max(10, rect.top - panelHeight - 6);
      }

      const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8));

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

  const groupedFilteredTags: Record<string, string[]> = {};
  for (const t of filteredTags) {
    const { category } = parseTag(t);
    if (!groupedFilteredTags[category]) {
      groupedFilteredTags[category] = [];
    }
    groupedFilteredTags[category].push(t);
  }

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleSaveQuickTag = async () => {
    const cat = newCatInputValue.trim() || "General";
    const nm = newNameInputValue.trim();
    if (nm) {
      const formatted = formatTag(cat, nm);
      await addTag(formatted);
      onChange([...selectedTags, formatted]);
      setNewNameInputValue("");
    }
    setIsAddingTag(false);
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      {mode === "editor" ? (
        <TagDropdownEditorTrigger
          selectedTags={selectedTags}
          triggerRef={triggerRef}
          onToggleDropdown={() => setDropdownOpen((o) => !o)}
          onRemoveTag={(t) => onChange(selectedTags.filter((tag) => tag !== t))}
        />
      ) : (
        <TagDropdownFilterTrigger
          selectedTags={selectedTags}
          placeholder={placeholder}
          dropdownOpen={dropdownOpen}
          triggerRef={triggerRef}
          onToggleDropdown={() => setDropdownOpen((o) => !o)}
          onClearTags={() => onChange([])}
        />
      )}

      {dropdownOpen &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: portalCoords.top,
              left: portalCoords.left,
              width: Math.min(280, window.innerWidth - 16),
              maxWidth: "calc(100vw - 16px)",
              zIndex: 9999,
            }}
            className="bg-surface border-border animate-fade-in flex flex-col overflow-hidden rounded-xl border shadow-2xl"
          >
            {/* Search Bar & Match Mode */}
            <TagDropdownSearchBar
              searchTagQuery={searchTagQuery}
              selectedTagsCount={selectedTags.length}
              mode={mode}
              tagMatchMode={tagMatchMode}
              onSearchChange={setSearchTagQuery}
              onClearTags={() => onChange([])}
              onSetMatchMode={setTagMatchMode}
            />

            {/* Tag List Grouped by Category */}
            <div
              ref={listContainerRef}
              className="max-h-60 flex-1 space-y-2.5 overflow-y-auto px-1.5 py-2"
            >
              <TagDropdownList
                groupedFilteredTags={groupedFilteredTags}
                categoryColors={categoryColors}
                selectedTags={selectedTags}
                searchTagQuery={searchTagQuery}
                onToggleTag={handleToggleTag}
              />

              {/* Quick Add Tag Row */}
              <TagDropdownQuickAdd
                isVisible={isAddingTag}
                newCatInputValue={newCatInputValue}
                newNameInputValue={newNameInputValue}
                onCatChange={setNewCatInputValue}
                onNameChange={setNewNameInputValue}
                onSave={handleSaveQuickTag}
                onCancel={() => setIsAddingTag(false)}
              />
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
