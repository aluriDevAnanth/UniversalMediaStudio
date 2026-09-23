import React, { useState, useRef, useEffect } from "react";
import { Search, X, Check, Plus } from "lucide-react";
import { VideoRecord } from "../../env";
import { TagBadge } from "../TagBadge";

export interface ContextMenuTagPanelProps {
  tags: string[];
  video: VideoRecord;
  onUpdateVideoTags: (videoId: string, tags: string[]) => void;
  onAddTag: (raw: string) => Promise<void>;
}

export const ContextMenuTagPanel: React.FC<ContextMenuTagPanelProps> = ({
  tags,
  video,
  onUpdateVideoTags,
  onAddTag,
}) => {
  const [tagSearch, setTagSearch] = useState("");
  const [newTagValue, setNewTagValue] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const tagSearchRef = useRef<HTMLInputElement>(null);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => tagSearchRef.current?.focus(), 30);
  }, []);

  useEffect(() => {
    if (isAddingTag) {
      setTimeout(() => newTagInputRef.current?.focus(), 30);
    }
  }, [isAddingTag]);

  const filteredTags = tags.filter((t) =>
    t.toLowerCase().includes(tagSearch.toLowerCase()),
  );

  const handleAddNewTag = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    await onAddTag(trimmed);
    setNewTagValue("");
    setIsAddingTag(false);
    setTagSearch("");
  };

  return (
    <div className="bg-background/60 mx-2 mb-1 mt-1 overflow-hidden rounded-lg border border-border">
      {/* Search input */}
      <div className="border-border/60 relative border-b px-2 py-1.5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" />
        <input
          ref={tagSearchRef}
          type="text"
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          placeholder="Search tags…"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="placeholder-muted/60 w-full rounded border border-border bg-background py-0.5 pl-6 pr-6 text-[11px] text-foreground focus:border-primary focus:outline-none"
        />
        {tagSearch && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTagSearch("");
              tagSearchRef.current?.focus();
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* Tag list */}
      <div className="max-h-36 overflow-y-auto">
        {filteredTags.length === 0 ? (
          <p className="px-3 py-2 text-center text-[11px] italic text-muted">
            {tagSearch ? `No tags matching "${tagSearch}"` : "No tags yet."}
          </p>
        ) : (
          filteredTags.map((t) => {
            const isOn = video.tags.includes(t);
            return (
              <button
                key={t}
                onClick={() => {
                  const next = isOn
                    ? video.tags.filter((x) => x !== t)
                    : [...video.tags, t];
                  onUpdateVideoTags(video.id, next);
                }}
                className={`flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-xs transition ${
                  isOn
                    ? "bg-primary/10 text-primary-text font-semibold"
                    : "text-foreground hover:bg-surface-hover"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded transition ${
                      isOn
                        ? "bg-primary text-white"
                        : "border border-border bg-background"
                    }`}
                  >
                    {isOn && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <TagBadge rawTag={t} size="xs" showDot selected={isOn} />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Add tag row */}
      {isAddingTag ? (
        <div className="border-border/40 bg-background/30 flex items-center gap-1.5 border-t px-3 py-1.5">
          <input
            ref={newTagInputRef}
            type="text"
            value={newTagValue}
            onChange={(e) => setNewTagValue(e.target.value)}
            placeholder="New tag…"
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                await handleAddNewTag(newTagValue);
              } else if (e.key === "Escape") {
                e.stopPropagation();
                setIsAddingTag(false);
                setNewTagValue("");
              }
            }}
            onBlur={() => {
              if (!newTagValue.trim()) setIsAddingTag(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsAddingTag(true);
          }}
          className="border-border/40 flex w-full cursor-pointer items-center gap-2 border-t px-3 py-1.5 text-xs text-muted transition hover:bg-surface-hover hover:text-primary-text"
        >
          <Plus className="h-3 w-3 shrink-0" />
          <span className="font-medium">New tag…</span>
        </button>
      )}
    </div>
  );
};
