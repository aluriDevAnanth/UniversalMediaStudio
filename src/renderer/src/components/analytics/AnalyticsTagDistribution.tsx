import React from "react";
import { Tag } from "lucide-react";

interface AnalyticsTagDistributionProps {
  tagDistribution: Record<string, number>;
}

export const AnalyticsTagDistribution: React.FC<AnalyticsTagDistributionProps> = ({
  tagDistribution,
}) => {
  const sortedTags = Object.entries(tagDistribution).sort((a, b) => b[1] - a[1]);
  const maxTagCount = Math.max(...Object.values(tagDistribution), 1);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <h3 className="font-bold text-foreground text-base mb-4 flex items-center gap-2">
        <Tag className="w-4 h-4 text-primary-text" />
        Tag Frequency Distribution
      </h3>

      {sortedTags.length === 0 ? (
        <div className="text-xs text-muted">No tag data available yet.</div>
      ) : (
        <div className="space-y-3">
          {sortedTags.map(([tag, count]) => {
            const pct = Math.round((count / maxTagCount) * 100);
            return (
              <div key={tag} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">#{tag}</span>
                  <span className="text-muted">
                    {count} video{count > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="w-full bg-background h-2.5 rounded-full overflow-hidden border border-border">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
