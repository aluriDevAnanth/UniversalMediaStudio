import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  Play,
  Info,
  HardDrive,
  Star,
  Clock,
  ListPlus,
  Tag,
  Trash2,
  Check,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  X,
} from "lucide-react";
import { VideoRecord } from "../env";
import { useVideoStore } from "../store/videoStore";

interface VideoContextMenuProps {
  video: VideoRecord;
  x: number;
  y: number;
  onClose: () => void;
  onInspectBundle: () => void;
}

type ExpandedSection = "playlists" | "tags" | null;

const MARGIN = 8;

export const VideoContextMenu: React.FC<VideoContextMenuProps> = ({
  video,
  x,
  y,
  onClose,
  onInspectBundle,
}) => {
  const {
    playlists,
    tags,
    setPlayingVideo,
    setSelectedVideoId,
    togglePlaylistVideo,
    updateVideoTags,
    deleteVideo,
    addTag,
    createPlaylist,
  } = useVideoStore();

  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: y, left: x });
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const [tagSearch, setTagSearch] = useState("");
  const [newTagValue, setNewTagValue] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newPlaylistValue, setNewPlaylistValue] = useState("");
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);
  const newTagInputRef = useRef<HTMLInputElement>(null);
  const newPlaylistInputRef = useRef<HTMLInputElement>(null);
  const tagSearchRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);

  // Derived
  const watchLaterPl = playlists.find((p) => p.id === "watch_later");
  const favouritePl = playlists.find((p) => p.id === "favourite");
  const isInWatchLater = watchLaterPl?.videoIds.includes(video.id);
  const isInFavourite = favouritePl?.videoIds.includes(video.id);
  const userPlaylists = playlists.filter((p) => !p.isDefault);

  const filteredTags = tags.filter((t) =>
    t.toLowerCase().includes(tagSearch.toLowerCase()),
  );

  // ─── Space-aware positioning ─────────────────────────────────────────────
  // Re-runs every time the menu content changes size (expanded section, etc.)
  const reposition = useCallback(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer opening right; flip left if not enough room
    const left = x + width + MARGIN > vw ? x - width : x;
    // Prefer opening down; flip up if not enough room
    const top = y + height + MARGIN > vh ? y - height : y;

    setPos({
      left: Math.max(MARGIN, Math.min(left, vw - width - MARGIN)),
      top: Math.max(MARGIN, Math.min(top, vh - height - MARGIN)),
    });
  }, [x, y]);

  // Initial mount: position then fade in
  useEffect(() => {
    reposition();
    requestAnimationFrame(() => {
      reposition();
      setVisible(true);
    });
  }, [reposition]);

  // Re-position whenever expanded section changes (menu height changes)
  useEffect(() => {
    reposition();
  }, [expandedSection, reposition]);

  // Also re-position on window resize
  useEffect(() => {
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [reposition]);

  // Close on outside mousedown, Escape, or external scroll
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = (e: Event) => {
      // Ignore scroll that originates inside the menu
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      onClose();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  // Focus tag search when tag panel opens
  useEffect(() => {
    if (expandedSection === "tags") {
      setTimeout(() => tagSearchRef.current?.focus(), 30);
    } else {
      setTagSearch("");
      setIsAddingTag(false);
      setNewTagValue("");
    }
  }, [expandedSection]);

  // Focus new tag input when it appears
  useEffect(() => {
    if (isAddingTag) {
      setTimeout(() => newTagInputRef.current?.focus(), 30);
    }
  }, [isAddingTag]);

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleAddTag = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) await addTag(trimmed);
    const next = video.tags.includes(trimmed)
      ? video.tags
      : [...video.tags, trimmed];
    await updateVideoTags(video.id, next);
    setNewTagValue("");
    setIsAddingTag(false);
    setTagSearch("");
  };

  // ─── Separator ───────────────────────────────────────────────────────────
  const Sep = () => <div className="border-border/60 my-1 border-t" />;

  // ─── Menu Item ───────────────────────────────────────────────────────────
  const Item = ({
    icon,
    label,
    onClick,
    danger = false,
    active = false,
    hasExpand = false,
    expanded = false,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
    active?: boolean;
    hasExpand?: boolean;
    expanded?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-xs transition ${
        danger
          ? "text-rose-500 hover:bg-rose-500/10"
          : active
            ? "bg-primary/8 text-primary-text hover:bg-primary/15"
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

  // ─── Playlist sub-panel ──────────────────────────────────────────────────
  const handleCreatePlaylist = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createPlaylist(trimmed);
    // Find the newly created playlist by name from the updated store
    const updatedPlaylists = useVideoStore.getState().playlists;
    const newPlaylist = updatedPlaylists.find((p) => p.name === trimmed);
    if (newPlaylist) {
      await togglePlaylistVideo(newPlaylist.id, video.id);
    }
    setNewPlaylistValue("");
    setIsAddingPlaylist(false);
  };

  const PlaylistPanel = () => (
    <div className="mx-2 mb-1 mt-1 overflow-hidden rounded-lg border border-border bg-background/60">
      {/* Existing playlists */}
      {userPlaylists.length === 0 && !isAddingPlaylist ? (
        <p className="px-3 py-2 text-[11px] italic text-muted">
          No playlists yet — create one below.
        </p>
      ) : (
        userPlaylists.map((pl) => {
          const isIn = pl.videoIds.includes(video.id);
          return (
            <button
              key={pl.id}
              onClick={() => togglePlaylistVideo(pl.id, video.id)}
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition ${
                isIn
                  ? "bg-primary/5 text-primary-text hover:bg-primary/10"
                  : "text-foreground hover:bg-surface-hover"
              }`}
            >
              <ListPlus
                className={`h-3 w-3 shrink-0 ${isIn ? "text-primary-text" : "text-muted"}`}
              />
              <span className="flex-1 truncate font-medium">{pl.name}</span>
              {isIn && <Check className="h-3 w-3 shrink-0 text-primary-text" />}
            </button>
          );
        })
      )}

      {/* Create playlist row */}
      {isAddingPlaylist ? (
        <div className="flex items-center gap-1.5 border-t border-border/40 bg-background/30 px-3 py-1.5">
          <input
            ref={newPlaylistInputRef}
            type="text"
            value={newPlaylistValue}
            onChange={(e) => setNewPlaylistValue(e.target.value)}
            placeholder="Playlist name…"
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                await handleCreatePlaylist(newPlaylistValue);
              } else if (e.key === "Escape") {
                e.stopPropagation();
                setIsAddingPlaylist(false);
                setNewPlaylistValue("");
              }
            }}
            onBlur={() => {
              if (!newPlaylistValue.trim()) setIsAddingPlaylist(false);
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsAddingPlaylist(true);
          }}
          className="flex w-full cursor-pointer items-center gap-2 border-t border-border/40 px-3 py-1.5 text-xs text-muted transition hover:bg-surface-hover hover:text-primary-text"
        >
          <Plus className="h-3 w-3 shrink-0" />
          <span className="font-medium">New playlist…</span>
        </button>
      )}
    </div>
  );

  // ─── Tag sub-panel ───────────────────────────────────────────────────────
  const TagPanel = () => (
    <div className="mx-2 mb-1 mt-1 overflow-hidden rounded-lg border border-border bg-background/60">
      {/* Search input */}
      <div className="relative border-b border-border/60 px-2 py-1.5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" />
        <input
          ref={tagSearchRef}
          type="text"
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          placeholder="Search tags…"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="w-full rounded border border-border bg-background py-0.5 pl-6 pr-6 text-[11px] text-foreground placeholder-muted/60 focus:border-primary focus:outline-none"
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
                  updateVideoTags(video.id, next);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition ${
                  isOn
                    ? "bg-primary/5 text-primary-text hover:bg-primary/10"
                    : "text-foreground hover:bg-surface-hover"
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded transition ${
                    isOn
                      ? "bg-primary text-white"
                      : "border border-border bg-background"
                  }`}
                >
                  {isOn && <Check className="h-2.5 w-2.5" />}
                </span>
                <span className="flex-1 truncate font-medium">#{t}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Add tag row */}
      {isAddingTag ? (
        <div className="flex items-center gap-1.5 border-t border-border/40 bg-background/30 px-3 py-1.5">
          <input
            ref={newTagInputRef}
            type="text"
            value={newTagValue}
            onChange={(e) => setNewTagValue(e.target.value)}
            placeholder="New tag…"
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                await handleAddTag(newTagValue);
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
          className="flex w-full cursor-pointer items-center gap-2 border-t border-border/40 px-3 py-1.5 text-xs text-muted transition hover:bg-surface-hover hover:text-primary-text"
        >
          <Plus className="h-3 w-3 shrink-0" />
          <span className="font-medium">New tag…</span>
        </button>
      )}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className={`w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 transition-all duration-[60ms] ${
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
    >
      {/* ── Header ── */}
      <div className="border-b border-border bg-background/40 px-3 pb-2 pt-2.5">
        <p className="line-clamp-1 text-xs font-bold text-foreground">
          {video.title}
        </p>
        <p className="mt-0.5 text-[10px] text-muted">
          {video.resolution} · {formatDuration(video.duration)} ·{" "}
          {video.playCount || 0} views
        </p>
      </div>

      <div className="px-1 py-1">
        {/* ── Playback ── */}
        <Item
          icon={<Play className="h-3.5 w-3.5" />}
          label="Play"
          onClick={() => run(() => setPlayingVideo(video))}
        />
        <Item
          icon={<Info className="h-3.5 w-3.5" />}
          label="Show Details"
          onClick={() => run(() => setSelectedVideoId(video.id))}
        />
        <Item
          icon={<HardDrive className="h-3.5 w-3.5" />}
          label="Inspect Bundle"
          onClick={() => run(onInspectBundle)}
        />

        <Sep />

        {/* ── Playlists ── */}
        <Item
          icon={<Star className="h-3.5 w-3.5" />}
          label={isInFavourite ? "Remove from Favourites" : "Add to Favourites"}
          active={!!isInFavourite}
          onClick={() => togglePlaylistVideo("favourite", video.id)}
        />
        <Item
          icon={<Clock className="h-3.5 w-3.5" />}
          label={
            isInWatchLater ? "Remove from Watch Later" : "Add to Watch Later"
          }
          active={!!isInWatchLater}
          onClick={() => togglePlaylistVideo("watch_later", video.id)}
        />
        {userPlaylists.length > 0 && (
          <>
            <Item
              icon={<ListPlus className="h-3.5 w-3.5" />}
              label="Add to Playlist"
              hasExpand
              expanded={expandedSection === "playlists"}
              onClick={() =>
                setExpandedSection((s) =>
                  s === "playlists" ? null : "playlists",
                )
              }
            />
            {expandedSection === "playlists" && <PlaylistPanel />}
          </>
        )}

        <Sep />

        {/* ── Tags ── */}
        <Item
          icon={<Tag className="h-3.5 w-3.5" />}
          label="Manage Tags"
          hasExpand
          expanded={expandedSection === "tags"}
          onClick={() =>
            setExpandedSection((s) => (s === "tags" ? null : "tags"))
          }
        />
        {expandedSection === "tags" && <TagPanel />}

        <Sep />

        {/* ── Danger ── */}
        <Item
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label="Delete Bundle"
          danger
          onClick={() => run(() => deleteVideo(video.id))}
        />
      </div>
    </div>,
    document.body,
  );
};
