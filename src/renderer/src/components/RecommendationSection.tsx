import React, { useState, useEffect } from "react";
import { Sparkles, Flame, Film, Lightbulb } from "lucide-react";
import { VideoRecord } from "../env";
import { VideoCard } from "./VideoCard";

export interface RecommendationItem {
  video: VideoRecord;
  score: number;
  reasons: string[];
  source: string;
}

interface RecommendationSectionProps {
  currentVideoId?: string;
  title: string;
  type: "personalized" | "trending" | "similar";
  limit?: number;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  currentVideoId,
  title,
  type,
  limit = 8,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchRecommendations = async () => {
      try {
        let response: { success: boolean; recommendations?: any[]; error?: string } | undefined;

        if (type === "personalized") {
          response = await window.api.recommendations.get({
            videoId: currentVideoId,
            limit,
          });
        } else if (type === "trending") {
          response = await window.api.recommendations.trending({ limit });
        } else if (type === "similar" && currentVideoId) {
          response = await window.api.recommendations.becauseYouWatched({
            videoId: currentVideoId,
            limit,
          });
        }

        if (isMounted && response?.success && response.recommendations) {
          setRecommendations(response.recommendations);
        }
      } catch (err) {
        console.error("Failed to load recommendations:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecommendations();

    return () => {
      isMounted = false;
    };
  }, [currentVideoId, type, limit]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted animate-pulse">
        <Sparkles className="h-4 w-4 text-primary animate-spin" />
        <span>Curating recommendations for you...</span>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getSectionIcon = () => {
    switch (type) {
      case "trending":
        return <Flame className="h-4 w-4 text-amber-500" />;
      case "similar":
        return <Film className="h-4 w-4 text-cyan-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <section className="my-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getSectionIcon()}
          <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">
            {title}
          </h3>
        </div>
        <span className="text-[11px] font-medium text-muted bg-surface/80 border border-border/60 px-2 py-0.5 rounded-full">
          {recommendations.length} Recommended
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {recommendations.map((rec) => (
          <div key={rec.video.id} className="relative flex flex-col group">
            <VideoCard video={rec.video} />

            {/* Recommendation Reason Pill */}
            {rec.reasons && rec.reasons.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 bg-surface/90 border border-border/70 rounded-lg text-[10px] text-muted truncate shadow-xs">
                <Lightbulb className="h-3 w-3 shrink-0 text-amber-400" />
                <span className="truncate">{rec.reasons[0]}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
