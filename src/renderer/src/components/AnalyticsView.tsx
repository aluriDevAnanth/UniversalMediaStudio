import React from "react";
import { BarChart3, Film, Play, Sparkles, Cpu } from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { AnalyticsMetricCard, AnalyticsTagDistribution } from "./analytics";

export const AnalyticsView: React.FC = () => {
  const { analytics } = useVideoStore();

  const totalPlays = analytics?.totalPlayCount || 0;
  const totalVideos = analytics?.totalVideos || 0;
  const tagDist = analytics?.tagDistribution || {};

  return (
    <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 py-2 px-2 md:px-4 mx-auto w-full">
      {/* Title */}
      <div className="border-b border-border pb-4">
        <h2 className="text-lg md:text-2xl font-bold text-foreground flex items-center gap-2 md:gap-3">
          <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-primary-text shrink-0" />
          <span>Application & Media Telemetry Analytics</span>
        </h2>
        <p className="text-xs text-muted mt-1">
          Real-time insights into video playback counts, tag frequency
          distributions, and .adaumc processing performance.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <AnalyticsMetricCard
          title="Total Catalog"
          icon={Film}
          value={totalVideos}
          subtitle=".adaumc bundles"
        />

        <AnalyticsMetricCard
          title="Playback Count"
          icon={Play}
          iconColor="text-emerald-500"
          value={totalPlays}
          subtitle="Stream views"
        />

        <AnalyticsMetricCard
          title="Median Cut GIF Encoder"
          icon={Sparkles}
          iconColor="text-amber-500"
          value="Paul Heckbert 1982"
          subtitle="256-color palettegen"
        />

        <AnalyticsMetricCard
          title="Sprite Tiling Engine"
          icon={Cpu}
          iconColor="text-violet-500"
          value="5x5 Grid (25 Tiles)"
          subtitle="WebVTT Manifest"
        />
      </div>

      {/* Tag Distribution Visualization */}
      <AnalyticsTagDistribution tagDistribution={tagDist} />
    </div>
  );
};
