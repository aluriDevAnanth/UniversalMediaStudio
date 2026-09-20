import React from "react";

export interface ScrollIndicatorPillProps {
  totalItems: number;
  showingStart: number;
  showingEnd: number;
}

export const ScrollIndicatorPill: React.FC<ScrollIndicatorPillProps> = ({
  totalItems,
  showingStart,
  showingEnd,
}) => {
  if (totalItems <= 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-4 right-4">
      <div className="bg-surface/75 border-border/80 rounded-full border px-3 py-1.5 text-[11px] font-medium tabular-nums text-muted shadow-lg backdrop-blur-md">
        <span className="font-semibold text-foreground">
          {showingStart}–{showingEnd}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-foreground">{totalItems}</span>{" "}
        videos
      </div>
    </div>
  );
};
