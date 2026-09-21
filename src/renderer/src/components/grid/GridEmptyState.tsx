import React from "react";
import { Film, Upload } from "lucide-react";

export interface GridEmptyStateProps {
  hasFilter: boolean;
  onImport: () => void;
}

export const GridEmptyState: React.FC<GridEmptyStateProps> = ({
  hasFilter,
  onImport,
}) => {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center text-muted">
      <div className="bg-primary/10 border-primary-border/20 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border text-primary-text">
        <Film className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-foreground">
        No .adaumc videos found
      </h3>
      <p className="mb-6 mt-1 max-w-sm text-xs text-muted">
        {hasFilter
          ? "No video bundles match your active search filter."
          : "Drag & Drop any video file anywhere on the app or click below to import."}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onImport}
          className="shadow-primary/30 flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-hover"
        >
          <Upload className="h-4 w-4" />
          Import Video / .adaumc File
        </button>
      </div>
    </div>
  );
};
