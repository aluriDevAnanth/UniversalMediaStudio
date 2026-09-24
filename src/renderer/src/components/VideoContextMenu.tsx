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
} from "lucide-react";
import { VideoRecord } from "../env";
import { useVideoStore } from "../store/videoStore";
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuHeader,
  ContextMenuPlaylistPanel,
  ContextMenuTagPanel,
} from "./context-menu/index";

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
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);
  const [visible, setVisible] = useState(false);

  const watchLaterPl = playlists.find((p) => p.id === "watch_later");
  const favouritePl = playlists.find((p) => p.id === "favourite");
  const isInWatchLater = watchLaterPl?.videoIds.includes(video.id);
  const isInFavourite = favouritePl?.videoIds.includes(video.id);
  const userPlaylists = playlists.filter((p) => !p.isDefault);

  const reposition = useCallback(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = x + width + MARGIN > vw ? x - width : x;
    const top = y + height + MARGIN > vh ? y - height : y;

    setPos({
      left: Math.max(MARGIN, Math.min(left, vw - width - MARGIN)),
      top: Math.max(MARGIN, Math.min(top, vh - height - MARGIN)),
    });
  }, [x, y]);

  useEffect(() => {
    reposition();
    requestAnimationFrame(() => {
      reposition();
      setVisible(true);
    });
  }, [reposition]);

  useEffect(() => {
    reposition();
  }, [expandedSection, reposition]);

  useEffect(() => {
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [reposition]);

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

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const handleAddTag = async (raw: string) => {
    if (!tags.includes(raw)) await addTag(raw);
    const next = video.tags.includes(raw)
      ? video.tags
      : [...video.tags, raw];
    await updateVideoTags(video.id, next);
  };

  const handleCreatePlaylist = async (name: string) => {
    await createPlaylist(name);
    const updatedPlaylists = useVideoStore.getState().playlists;
    const newPlaylist = updatedPlaylists.find((p) => p.name === name);
    if (newPlaylist) {
      await togglePlaylistVideo(newPlaylist.id, video.id);
    }
  };

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className={`w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 transition-all duration-[60ms] ${
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
    >
      <ContextMenuHeader video={video} />

      <div className="px-1 py-1">
        <ContextMenuItem
          icon={<Play className="size-3" />}
          label="Play"
          onClick={() => run(() => setPlayingVideo(video))}
        />
        <ContextMenuItem
          icon={<Info className="size-3" />}
          label="Show Details"
          onClick={() => run(() => setSelectedVideoId(video.id))}
        />
        <ContextMenuItem
          icon={<HardDrive className="size-3" />}
          label="Inspect Bundle"
          onClick={() => run(onInspectBundle)}
        />

        <ContextMenuSeparator />

        <ContextMenuItem
          icon={<Star className="h-3.5 w-3.5" />}
          label={isInFavourite ? "Remove from Favourites" : "Add to Favourites"}
          active={!!isInFavourite}
          onClick={() => togglePlaylistVideo("favourite", video.id)}
        />
        <ContextMenuItem
          icon={<Clock className="h-3.5 w-3.5" />}
          label={
            isInWatchLater ? "Remove from Watch Later" : "Add to Watch Later"
          }
          active={!!isInWatchLater}
          onClick={() => togglePlaylistVideo("watch_later", video.id)}
        />
        {userPlaylists.length > 0 && (
          <>
            <ContextMenuItem
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
            {expandedSection === "playlists" && (
              <ContextMenuPlaylistPanel
                userPlaylists={userPlaylists}
                video={video}
                isAddingPlaylist={isAddingPlaylist}
                onSetIsAddingPlaylist={setIsAddingPlaylist}
                onTogglePlaylistVideo={togglePlaylistVideo}
                onCreatePlaylist={handleCreatePlaylist}
              />
            )}
          </>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          icon={<Tag className="h-3.5 w-3.5" />}
          label="Manage Tags"
          hasExpand
          expanded={expandedSection === "tags"}
          onClick={() =>
            setExpandedSection((s) => (s === "tags" ? null : "tags"))
          }
        />
        {expandedSection === "tags" && (
          <ContextMenuTagPanel
            tags={tags}
            video={video}
            onUpdateVideoTags={updateVideoTags}
            onAddTag={handleAddTag}
          />
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
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
