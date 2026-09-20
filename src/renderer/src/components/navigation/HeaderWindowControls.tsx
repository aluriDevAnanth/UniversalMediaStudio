import React from "react";
import { Minus, Square, X } from "lucide-react";

export const HeaderWindowControls: React.FC = () => {
  const handleMinimize = () => window.api?.windowControls?.minimize();
  const handleMaximize = () => window.api?.windowControls?.maximize();
  const handleClose = () => window.api?.windowControls?.close();

  return (
    <div className="flex items-center gap-0.5 border-border/60 border-l pl-1 sm:pl-1.5 ml-0.5">
      <button
        onClick={handleMinimize}
        title="Minimize"
        className="hover:bg-surface-hover text-muted hover:text-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={handleMaximize}
        title="Maximize"
        className="hover:bg-surface-hover text-muted hover:text-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition"
      >
        <Square className="h-3 w-3" />
      </button>
      <button
        onClick={handleClose}
        title="Close Studio"
        className="hover:bg-rose-500/20 text-muted hover:text-rose-400 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
