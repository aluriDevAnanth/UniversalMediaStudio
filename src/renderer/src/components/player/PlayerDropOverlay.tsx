import React from "react";
import { MessageSquare } from "lucide-react";

export interface PlayerDropOverlayProps {
  isVisible: boolean;
}

export const PlayerDropOverlay: React.FC<PlayerDropOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="border-primary animate-in fade-in pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center border-4 border-dashed bg-slate-950/80 p-6 text-center text-white backdrop-blur-md duration-200">
      <div className="bg-primary/20 text-primary-text border-primary-border/40 mb-3 animate-bounce rounded-full border p-4 shadow-2xl">
        <MessageSquare className="text-primary-text h-10 w-10" />
      </div>
      <h3 className="text-xl font-bold text-white">
        Drop Subtitle File to Attach to Player
      </h3>
      <p className="text-muted mt-1 max-w-sm text-xs">
        Supports .vtt, .srt, .ass, and .sub files. Will be bundled into
        .adaumc container automatically.
      </p>
    </div>
  );
};
