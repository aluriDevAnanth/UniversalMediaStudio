import React from "react";
import { Tag as TagIcon } from "lucide-react";
import { VideoRecord } from "../../env";
import { TagDropdown } from "../TagDropdown";

export interface PlayerDetailsBarProps {
  video: VideoRecord;
  onUpdateTags: (tags: string[]) => void;
}

export const PlayerDetailsBar: React.FC<PlayerDetailsBarProps> = ({
  video,
  onUpdateTags,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
      <div>
        <h3 className="text-foreground text-sm sm:text-base font-bold">
          {video.title}
        </h3>
        <p className="text-muted mt-0.5 text-xs">
          Resolution: {video.resolution} • Duration:{" "}
          {Math.floor(video.duration / 60)}m {Math.floor(video.duration % 60)}s •
          Created: {new Date(video.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Tag Selection Dropdown */}
      <div className="flex items-center gap-2">
        <TagIcon className="text-primary-text h-4 w-4" />
        <span className="text-muted text-xs font-semibold">Tags:</span>
        <TagDropdown
          selectedTags={video.tags || []}
          onChange={onUpdateTags}
          placeholder="Add tags..."
          mode="editor"
        />
      </div>
    </div>
  );
};
