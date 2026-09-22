import React from "react";
import { HardDrive, X } from "lucide-react";

export interface BundleExplorerHeaderProps {
  title: string;
  payloadStartOffset: number;
  onClose: () => void;
}

export const BundleExplorerHeader: React.FC<BundleExplorerHeaderProps> = ({
  title,
  payloadStartOffset,
  onClose,
}) => {
  return (
    <div className="border-border bg-background/60 flex items-center justify-between border-b p-2 sm:p-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 mr-2">
        <span className="bg-primary/20 text-primary-text border-primary-border/40 flex shrink-0 animate-pulse items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 font-mono text-[10px] sm:text-xs font-bold">
          <HardDrive className="h-3.5 w-3.5" />
          .adaumc Explorer
        </span>
        <div className="min-w-0">
          <h2 className="text-foreground truncate text-xs sm:text-sm font-bold">
            {title}
          </h2>
          <p className="text-muted font-mono text-[9px] sm:text-[10px] truncate">
            Magic: ADAUMC (0x414441554D43) • Payload: {payloadStartOffset || 10} bytes
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="hover:bg-surface-hover text-muted hover:text-foreground shrink-0 cursor-pointer rounded-xl p-1.5 transition"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};
