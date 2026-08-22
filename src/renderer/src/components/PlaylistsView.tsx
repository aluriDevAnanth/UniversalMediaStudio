import React, { useState } from "react";
import { ListVideo, Plus, Clock, Star, Trash2, Film } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { VideoCard } from "./VideoCard";

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
    <div className="flex flex-1 gap-2 overflow-hidden p-2">
      {/* Playlists Sidebar */}
      <div className="flex w-72 flex-col gap-4 rounded-lg border border-border bg-surface p-2">
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
          <form
            onSubmit={handleCreate}
            className="space-y-2 rounded-xl border border-border bg-background p-3"
          >
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder-muted focus:border-primary focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-primary py-1 text-xs font-semibold text-white hover:bg-primary-hover"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-lg border border-border bg-surface-hover px-3 py-1 text-xs text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Playlist Items */}
        <div className="flex-1 space-y-1 overflow-y-auto">
          {playlists.map((pl) => {
            const isActive = activePlaylist?.id === pl.id;
            return (
              <div
                key={pl.id}
                onClick={() => setSelectedPlaylistId(pl.id)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl p-3 transition ${
                  isActive
                    ? "shadow-primary/20 bg-primary text-white shadow-lg"
                    : "bg-background/40 border border-transparent text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  {pl.id === "watch_later" ? (
                    <Clock
                      className={`h-4 w-4 ${isActive ? "text-white" : "text-primary-text"}`}
                    />
                  ) : pl.id === "favourite" ? (
                    <Star className="h-4 w-4 animate-pulse fill-current text-amber-500" />
                  ) : (
                    <ListVideo className="h-4 w-4 text-muted" />
                  )}
                  <span className="max-w-[120px] truncate text-sm font-semibold">
                    {pl.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-background/60 px-2 py-0.5 font-mono text-foreground">
                    {pl.videoIds.length}
                  </span>
                  {!pl.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlaylist(pl.id);
                      }}
                      className="p-1 transition hover:text-rose-500"
                      title="Delete playlist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Playlist Videos Content Grid */}
      <div className="flex flex-1 flex-col overflow-y-auto rounded-lg border border-border bg-surface p-2">
        {playlistVideos.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-muted">
            <Film className="text-muted/60 mb-3 h-12 w-12" />
            <p className="text-sm font-medium text-foreground">
              No videos in this playlist yet
            </p>
            <p className="mt-1 text-xs">
              Click the clock or star icon on any video card to add it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {playlistVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
