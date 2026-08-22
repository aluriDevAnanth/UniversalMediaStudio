import React from "react";
import { BarChart3, Film, Play, Tag, Cpu, Sparkles } from "lucide-react";
import { useVideoStore } from "../store/videoStore";

export const AnalyticsView: React.FC = () => {
  const { analytics } = useVideoStore();

  const totalPlays = analytics?.totalPlayCount || 0;
  const totalVideos = analytics?.totalVideos || 0;
  const tagDist = analytics?.tagDistribution || {};

  const sortedTags = Object.entries(tagDist).sort((a, b) => b[1] - a[1]);
  const maxTagCount = Math.max(...Object.values(tagDist), 1);

  return (
    <div className="flex-1 overflow-y-auto space-y-6 py-2 px-4 mx-auto w-full">
      {/* Title */}
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary-text" />
          Application & Media Telemetry Analytics
        </h2>
        <p className="text-xs text-muted mt-1">
          Real-time insights into video playback counts, tag frequency
          distributions, and .adaumc processing performance.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase">
              Total Catalog
            </span>
            <Film className="w-4 h-4 text-primary-text" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-foreground">
            {totalVideos}
          </div>
          <div className="text-xs text-muted mt-1">.adaumc bundles</div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase">
              Playback Count
            </span>
            <Play className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-foreground">
            {totalPlays}
          </div>
          <div className="text-xs text-muted mt-1">Stream views</div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase">
              Median Cut GIF Encoder
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-foreground">
            Paul Heckbert 1982
          </div>
          <div className="text-xs text-muted mt-1">256-color palettegen</div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase">
              Sprite Tiling Engine
            </span>
            <Cpu className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-foreground">
            5x5 Grid (25 Tiles)
          </div>
          <div className="text-xs text-muted mt-1">WebVTT Manifest</div>
        </div>
      </div>

      {/* Tag Distribution Visualization */}
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
    </div>
  );
};
