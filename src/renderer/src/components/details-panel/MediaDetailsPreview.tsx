import React from "react";
import { Play } from "lucide-react";
import { VideoRecord } from "../../env";

interface MediaDetailsPreviewProps {
  video: VideoRecord;
  onPlay: () => void;
}

export const MediaDetailsPreview: React.FC<MediaDetailsPreviewProps> = ({
  video,
  onPlay,
}) => {
  return (
    <div className="group/sidebar border-border/80 bg-background/60 relative aspect-video overflow-hidden rounded-xl border shadow-inner backdrop-blur-xs">
      <img
        src={`adaumc://${video.id}/thumbnail`}
        alt={video.title}
        className="h-full w-full object-cover"
      />
      <button
        onClick={onPlay}
        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-slate-950/45 opacity-0 transition duration-300 group-hover/sidebar:opacity-100 backdrop-blur-2xs"
      >
        <div className="bg-primary flex h-12 w-12 scale-90 transform items-center justify-center rounded-full text-white shadow-lg transition duration-300 group-hover/sidebar:scale-100">
          <Play className="ml-1 h-5 w-5 fill-current" />
        </div>
      </button>
      <div className="bg-primary absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
        {video.resolution}
      </div>
    </div>
  );
};
