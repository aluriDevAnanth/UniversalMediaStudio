import React, { useState, useEffect } from "react";
import { ListVideo, Plus } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { VideoCard } from "./VideoCard";
import {
  PlaylistSidebarItem,
  PlaylistCreateForm,
  PlaylistEmptyState,
} from "./playlists/index";

export const PlaylistsView: React.FC = () => {
  const {
    playlists,
    videos,
    createPlaylist,
    deletePlaylist,
    selectedPlaylistId,
    setSelectedPlaylistId,
  } = useVideoStore();
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isInput) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      if (e.key.toLowerCase() === "n" && !isCtrl) {
        e.preventDefault();
        setIsCreating(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activePlaylist =
    playlists.find((p) => p.id === (selectedPlaylistId || "watch_later")) ||
    playlists[0];

  const playlistVideos = videos.filter((v) =>
    activePlaylist?.videoIds.includes(v.id),
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 gap-2 overflow-hidden p-2">
      {/* Playlists Sidebar */}
      <div className="flex w-full md:w-64 lg:w-72 shrink-0 flex-col gap-3 rounded-lg border border-border bg-surface p-2 max-h-48 md:max-h-none overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <ListVideo className="h-5 w-5 text-primary-text" />
            Playlists
          </h2>

          <button
            onClick={() => setIsCreating(true)}
            className="cursor-pointer rounded-lg bg-primary p-1.5 text-white transition hover:bg-primary-hover"
            title="Create Custom Playlist"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Create Input Form */}
        {isCreating && (
          <PlaylistCreateForm
            newPlaylistName={newPlaylistName}
            onNameChange={setNewPlaylistName}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        )}

        {/* Playlist Items */}
        <div className="flex-1 space-y-1 overflow-y-auto">
          {playlists.map((pl) => (
            <PlaylistSidebarItem
              key={pl.id}
              playlist={pl}
              isActive={activePlaylist?.id === pl.id}
              onSelect={() => setSelectedPlaylistId(pl.id)}
              onDelete={deletePlaylist}
            />
          ))}
        </div>
      </div>

      {/* Selected Playlist Videos Grid */}
      <div className="flex flex-1 flex-col overflow-y-auto rounded-lg border border-border bg-surface/50 p-3">
        <div className="border-border mb-3 flex items-center justify-between border-b pb-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              {activePlaylist?.name}
            </h2>
            <p className="text-muted text-xs">
              {playlistVideos.length} video
              {playlistVideos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {playlistVideos.length === 0 ? (
          <PlaylistEmptyState playlistName={activePlaylist?.name || "Playlist"} />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {playlistVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
