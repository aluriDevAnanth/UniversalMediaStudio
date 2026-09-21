import React from "react";
import { VideoRecord } from "../../env";

interface MediaDetailsMetadataProps {
  video: VideoRecord;
}

export const MediaDetailsMetadata: React.FC<MediaDetailsMetadataProps> = ({ video }) => {
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="glass-card grid grid-cols-2 gap-3 rounded-xl p-3 text-xs">
      <div>
        <span className="text-muted block text-[10px] font-medium uppercase">
          Duration
        </span>
        <span className="text-foreground font-semibold">
          {formatDuration(video.duration)}
        </span>
      </div>
      <div>
        <span className="text-muted block text-[10px] font-medium uppercase">
          Resolution
        </span>
        <span className="text-foreground font-semibold">
          {video.resolution}
        </span>
      </div>
      <div>
        <span className="text-muted block text-[10px] font-medium uppercase">
          Play Count
        </span>
        <span className="text-foreground font-semibold">
          {video.playCount || 0} views
        </span>
      </div>
      <div>
        <span className="text-muted block text-[10px] font-medium uppercase">
          Added Date
        </span>
        <span className="text-foreground font-semibold">
          {new Date(video.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};
