import React from "react";

export interface PlaylistCreateFormProps {
  newPlaylistName: string;
  onNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const PlaylistCreateForm: React.FC<PlaylistCreateFormProps> = ({
  newPlaylistName,
  onNameChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 rounded-xl border border-border bg-background p-3"
    >
      <input
        type="text"
        value={newPlaylistName}
        onChange={(e) => onNameChange(e.target.value)}
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
          onClick={onCancel}
          className="rounded-lg border border-border bg-surface-hover px-3 py-1 text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
