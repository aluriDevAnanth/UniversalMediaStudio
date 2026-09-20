import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCaptionOptions } from "@vidstack/react";

export interface CustomCaptionsMenuContentProps {
  subtitles: Array<{ key: string; label: string; lang: string }>;
  onAddSubtitle: () => void;
  onRemoveSubtitle: (key: string) => void;
}

export const CustomCaptionsMenuContent: React.FC<CustomCaptionsMenuContentProps> = ({
  subtitles,
  onAddSubtitle,
  onRemoveSubtitle,
}) => {
  const options = useCaptionOptions();

  return (
    <div className="relative flex w-full flex-col">
      {/* Upload button positioned cleanly in top-right of submenu header with high z-index */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddSubtitle();
        }}
        title="Upload Subtitle Track"
        className="bg-primary/30 hover:bg-primary/60 border-primary-border/40 absolute -top-9 right-1 z-50 flex cursor-pointer items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold text-white shadow-md transition"
      >
        <Plus className="h-3 w-3" />
        <span>Upload</span>
      </button>

      {/* Custom Subtitle Options List */}
      <div className="flex flex-col gap-0.5 py-1">
        {options.map((option) => {
          const matchedSub = subtitles.find(
            (s) =>
              s.label === option.label ||
              (option.track?.src && option.track.src.includes(s.key)),
          );

          return (
            <div
              key={option.value}
              onClick={() => option.select()}
              className={`flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-xs transition ${
                option.selected
                  ? "bg-white/15 font-semibold text-white"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <div className="flex max-w-[170px] items-center gap-2 truncate">
                <span className="text-primary-text w-3.5 text-center text-xs font-bold">
                  {option.selected ? "✓" : ""}
                </span>
                <span className="truncate">{option.label}</span>
              </div>

              {matchedSub && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveSubtitle(matchedSub.key);
                  }}
                  title="Remove subtitle track"
                  className="ml-2 cursor-pointer rounded p-1 text-white/40 transition hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
