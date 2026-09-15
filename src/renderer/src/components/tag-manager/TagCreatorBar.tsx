import React, { useRef, useState, useEffect } from "react";
import { Plus, Palette, ChevronDown } from "lucide-react";
import { PRESET_TAG_COLORS, getCategoryColor } from "../../utils/tagColors";

export interface TagCreatorBarProps {
  categories: string[];
  categoryColors: Record<string, string>;
  onAddTag: (category: string, name: string, color: string) => Promise<void>;
  onSetCategoryColor: (category: string, color: string) => Promise<any>;
}

export const TagCreatorBar: React.FC<TagCreatorBarProps> = ({
  categories,
  categoryColors,
  onAddTag,
  onSetCategoryColor,
}) => {
  const [newCatInput, setNewCatInput] = useState("");
  const [newNameInput, setNewNameInput] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_TAG_COLORS[0]);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catComboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cat = newCatInput.trim();
    if (cat) {
      const color = getCategoryColor(cat, categoryColors);
      setSelectedColor(color);
    }
  }, [newCatInput, categoryColors]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        catComboboxRef.current &&
        !catComboboxRef.current.contains(event.target as Node)
      ) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(newCatInput.toLowerCase().trim()),
  );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const cat = newCatInput.trim() || "General";
        const nm = newNameInput.trim();
        if (nm) {
          await onAddTag(cat, nm, selectedColor);
          setNewNameInput("");
        }
      }}
      className="border-border bg-background/40 flex flex-wrap items-center gap-2 border-b p-2 sm:px-4 sm:py-2.5"
    >
      {/* Category Combobox */}
      <div ref={catComboboxRef} className="relative w-full sm:w-40 md:w-48 shrink-0">
        <div className="border-border bg-background focus-within:border-primary focus-within:ring-primary/30 flex items-center justify-between rounded-lg border px-2.5 py-1.5 transition focus-within:ring-1">
          <input
            type="text"
            value={newCatInput}
            onChange={(e) => {
              setNewCatInput(e.target.value);
              setIsCatDropdownOpen(true);
            }}
            onFocus={() => setIsCatDropdownOpen(true)}
            placeholder="Category (e.g. Genre)..."
            className="text-foreground placeholder-muted/60 w-full bg-transparent text-xs focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setIsCatDropdownOpen((prev) => !prev)}
            className="text-muted hover:text-foreground shrink-0 cursor-pointer p-0.5"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Combobox Dropdown */}
        {isCatDropdownOpen && (
          <div className="border-border bg-surface absolute top-full left-0 z-50 mt-1 max-h-48 w-56 overflow-y-auto rounded-xl border p-1 shadow-2xl">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => {
                const cColor = getCategoryColor(cat, categoryColors);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setNewCatInput(cat);
                      setSelectedColor(cColor);
                      setIsCatDropdownOpen(false);
                    }}
                    className="hover:bg-surface-hover flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition"
                  >
                    <span className="text-foreground truncate font-medium">
                      {cat}
                    </span>
                    <span
                      style={{ backgroundColor: cColor }}
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                    />
                  </button>
                );
              })
            ) : (
              <div className="text-muted p-2 text-center text-[11px]">
                Create category "{newCatInput.trim() || "New"}"
              </div>
            )}
          </div>
        )}
      </div>

      <span className="text-muted text-xs font-bold hidden sm:inline">:</span>

      {/* Tag Name Input */}
      <input
        type="text"
        value={newNameInput}
        onChange={(e) => setNewNameInput(e.target.value)}
        placeholder="New tag name..."
        className="border-border bg-background text-foreground placeholder-muted/60 focus:border-primary focus:ring-primary/30 min-w-[120px] flex-1 rounded-lg border px-3 py-1.5 text-xs transition focus:ring-1 focus:outline-none"
      />

      {/* Color Selector */}
      <div className="bg-background/60 border-border/80 flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1">
        <span className="text-muted mr-0.5 text-[10px] font-semibold tracking-wider uppercase hidden sm:inline">
          Color:
        </span>
        {PRESET_TAG_COLORS.slice(0, 6).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setSelectedColor(c);
              if (newCatInput.trim()) {
                onSetCategoryColor(newCatInput.trim(), c);
              }
            }}
            style={{ backgroundColor: c }}
            className={`h-4 w-4 cursor-pointer rounded-full transition-transform ${
              selectedColor === c
                ? "scale-110 ring-2 ring-white"
                : "opacity-60 hover:scale-110 hover:opacity-100"
            }`}
            title={`Set category color ${c}`}
          />
        ))}
        <label
          className="border-border bg-surface relative flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border transition hover:scale-110"
          title="Custom color picker"
        >
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => {
              const color = e.target.value;
              setSelectedColor(color);
              if (newCatInput.trim()) {
                onSetCategoryColor(newCatInput.trim(), color);
              }
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <Palette
            className="h-2.5 w-2.5"
            style={{ color: selectedColor }}
          />
        </label>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        className="bg-primary hover:bg-primary-hover flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Tag
      </button>
    </form>
  );
};
