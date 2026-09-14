import React from "react";
import { Check } from "lucide-react";
import { VideoRecord } from "../../env";

interface VideoCardThumbnailProps {
  video: VideoRecord;
  isHovered: boolean;
  isMultiSelected: boolean;
  onSelectToggle: (e: React.MouseEvent) => void;
  onPlay: (e: React.MouseEvent) => void;
}

export const VideoCardThumbnail: React.FC<VideoCardThumbnailProps> = ({
  video,
  isHovered,
  isMultiSelected,
  onSelectToggle,
  onPlay,
}) => {
  const staticThumbUrl = `adaumc://${video.id}/thumbnail`;
  const animatedGifUrl = `adaumc://${video.id}/gif`;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      onClick={onPlay}
      className="relative aspect-video cursor-pointer overflow-hidden bg-black/60"
    >
      <img
        src={isHovered ? animatedGifUrl : staticThumbUrl}
        alt={video.title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          // Fallback if animated gif is missing
          if (isHovered) {
            (e.target as HTMLImageElement).src = staticThumbUrl;
          }
        }}
      />

      {/* Selection Checkbox overlay */}
      <div
        onClick={onSelectToggle}
        className={`absolute left-2 top-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border transition backdrop-blur-sm ${
          isMultiSelected
            ? "border-primary bg-primary text-white shadow-md"
            : "border-white/40 bg-black/40 text-transparent opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
        }`}
        title={
          isMultiSelected
            ? "Deselect video"
            : "Select video for bulk actions"
        }
      >
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      </div>

      {/* Badges Overlay */}
      <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1">
        <span className="rounded border border-white/10 bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
          {formatDuration(video.duration)}
        </span>
        <span className="rounded border border-white/10 bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
          {video.resolution || "HD"}
        </span>
      </div>
    </div>
  );
};
