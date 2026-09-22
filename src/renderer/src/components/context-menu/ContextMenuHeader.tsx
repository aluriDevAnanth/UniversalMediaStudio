import React from "react";
import { VideoRecord } from "../../env";

export interface ContextMenuHeaderProps {
  video: VideoRecord;
}

export const ContextMenuHeader: React.FC<ContextMenuHeaderProps> = ({ video }) => {
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-background/40 select-none border-b border-border px-2 py-1">
      {/* Title Row Marquee */}
      <div className="relative flex overflow-x-hidden">
        <div className="animate-marquee flex gap-4 whitespace-nowrap pr-4 text-xs font-bold text-foreground">
          <span>{video.title}</span>
        </div>
        <div
          className="animate-marquee absolute left-0 top-0 flex gap-4 whitespace-nowrap pr-4 text-xs font-bold text-foreground"
          aria-hidden="true"
        >
          <span>{video.title}</span>
        </div>
      </div>

      {/* Subtitle Row Marquee */}
      <div className="relative mt-0.5 flex overflow-x-hidden">
        <div className="animate-marquee flex gap-3 whitespace-nowrap pr-3 text-[10px] text-muted">
          <span>
            {video.resolution} · {formatDuration(video.duration)} ·{" "}
            {video.playCount || 0} views
          </span>
        </div>
        <div
          className="animate-marquee absolute left-0 top-0 flex gap-3 whitespace-nowrap pr-3 text-[10px] text-muted"
          aria-hidden="true"
        >
          <span>
            {video.resolution} · {formatDuration(video.duration)} ·{" "}
            {video.playCount || 0} views
          </span>
        </div>
      </div>
    </div>
  );
};
