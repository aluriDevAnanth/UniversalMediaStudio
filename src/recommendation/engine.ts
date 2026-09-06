import { UserContext, RecommendationResult } from "./types";
import { ContentBasedRecommender } from "./contentBased";
import { CollaborativeRecommender } from "./collaborative";
import { ContextAwareRecommender } from "./contextAware";
import { RecommendationCache } from "./cache";

export class RecommendationEngine {
  private context: UserContext;
  private contentBased: ContentBasedRecommender;
  private collaborative: CollaborativeRecommender;
  private contextAware: ContextAwareRecommender;
  private static cache = new RecommendationCache();

  constructor(context: UserContext) {
    this.context = context;
    this.contentBased = new ContentBasedRecommender();
    this.collaborative = new CollaborativeRecommender(context);
    this.contextAware = new ContextAwareRecommender(context);
  }

  /**
   * Get personalized recommendations using multi-faceted hybrid blending & diversity re-ranking
   */
  public getRecommendations(
    sourceVideoId?: string,
    limit: number = 20,
  ): RecommendationResult[] {
    const cacheKey = RecommendationEngine.cache.getKey(this.context, "personalized", sourceVideoId);
    const cached = RecommendationEngine.cache.get(cacheKey);
    if (cached) return cached.slice(0, limit);

    const allVideos = this.context.allVideos || [];
    if (allVideos.length === 0) return [];

    const sourceVideo = sourceVideoId
      ? allVideos.find((v) => v.id === sourceVideoId)
      : undefined;

    let results: RecommendationResult[] = [];

    // 1. Content-based (if source video exists or current video is active)
    if (sourceVideo) {
      const contentResults = this.contentBased.getRecommendations(
        sourceVideo,
        allVideos,
        limit * 2,
      );
      results = results.concat(contentResults);
    }

    // 2. Collaborative filtering (always based on user profile)
    const collabResults = this.collaborative.getRecommendations(allVideos, limit * 2);
    results = results.concat(collabResults);

    // 3. Context-aware (search queries, filters, session time)
    const contextResults = this.contextAware.getRecommendations(allVideos, limit * 2);
    results = results.concat(contextResults);

    // 4. Blend and re-rank
    const blended = this.blendAndRank(results);

    // 5. Apply category diversity re-ranking
    const diverse = this.applyDiversity(blended, limit);

    RecommendationEngine.cache.set(cacheKey, diverse);
    return diverse;
  }

  /**
   * Blend results from different sources with adaptive weights
   */
  private blendAndRank(results: RecommendationResult[]): RecommendationResult[] {
    const videoMap = new Map<string, RecommendationResult>();

    for (const result of results) {
      if (!videoMap.has(result.video.id)) {
        videoMap.set(result.video.id, { ...result });
        continue;
      }

      const existing = videoMap.get(result.video.id)!;
      const combinedScore = this.combineScores(existing, result);
      const reasons = Array.from(new Set([...existing.reasons, ...result.reasons]));

      videoMap.set(result.video.id, {
        video: existing.video,
        score: combinedScore,
        reasons: reasons.slice(0, 3),
        source: "blended",
      });
    }

    return Array.from(videoMap.values()).sort((a, b) => b.score - a.score);
  }

  private combineScores(a: RecommendationResult, b: RecommendationResult): number {
    const hasRichHistory = (this.context.watchHistory?.length || 0) > 5;
    const hasSearchContext = (this.context.searchQuery || "").trim().length > 0;
    const hasTagFilters = (this.context.selectedTags || []).length > 0;

    let weightA = 0.35;
    let weightB = 0.35;
    let weightC = 0.30;

    if (hasRichHistory) {
      weightA = 0.25; // Content-based
      weightB = 0.50; // Collaborative / history
      weightC = 0.25;
    }

    if (hasSearchContext || hasTagFilters) {
      weightA = 0.20;
      weightB = 0.25;
      weightC = 0.55; // Context-aware
    }

    const sourceWeights: Record<string, number> = {
      content: weightA,
      collaborative: weightB,
      context: weightC,
      trending: 0.2,
      blended: 1.0,
    };

    const weightA_ = sourceWeights[a.source] || 0.33;
    const weightB_ = sourceWeights[b.source] || 0.33;

    return (a.score * weightA_ + b.score * weightB_) / (weightA_ + weightB_);
  }

  /**
   * Apply diversity filtering to avoid over-clustering around a single genre/franchise
   */
  private applyDiversity(results: RecommendationResult[], limit: number): RecommendationResult[] {
    const diverse: RecommendationResult[] = [];
    const seenCategories = new Map<string, number>();

    for (const result of results) {
      if (diverse.length >= limit) break;

      const categories = (result.video.tags || []).map((t) => t.split(":")[0]);
      const dominantCategory = categories[0] || "General";
      const seenCount = seenCategories.get(dominantCategory) || 0;

      // Allow maximum 3 videos from same primary category in the top batch
      if (seenCount < 3) {
        diverse.push(result);
        seenCategories.set(dominantCategory, seenCount + 1);
      }
    }

    // Fill remaining slots if any left
    if (diverse.length < limit) {
      for (const result of results) {
        if (!diverse.some((d) => d.video.id === result.video.id)) {
          diverse.push(result);
          if (diverse.length >= limit) break;
        }
      }
    }

    return diverse;
  }

  /**
   * Get trending videos based on play frequency and recent watches
   */
  public getTrendingVideos(limit: number = 10): RecommendationResult[] {
    const allVideos = this.context.allVideos || [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const trending = allVideos
      .map((v) => {
        const lastWatchedMs = v.lastWatchedAt
          ? typeof v.lastWatchedAt === "string"
            ? new Date(v.lastWatchedAt).getTime()
            : v.lastWatchedAt.getTime()
          : 0;

        const isRecent24h = lastWatchedMs > oneDayAgo ? 3.0 : 1.0;
        const isRecent7d = lastWatchedMs > sevenDaysAgo ? 1.5 : 1.0;
        const playScore = (v.playCount || 0) * 2.0;

        const score = playScore * isRecent24h * isRecent7d + (v.likes || 0) * 0.5;
        return {
          video: v,
          score,
          reasons: isRecent24h > 1.0 ? ["Trending today", "High replay interest"] : ["Popular in library"],
          source: "trending" as const,
        };
      })
      .filter((v) => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return trending;
  }

  /**
   * Get "Because you watched" recommendations relative to a specific video ID
   */
  public getBecauseYouWatched(
    videoId: string,
    limit: number = 10,
  ): RecommendationResult[] {
    const allVideos = this.context.allVideos || [];
    const sourceVideo = allVideos.find((v) => v.id === videoId);
    if (!sourceVideo) return [];

    const contentResults = this.contentBased.getRecommendations(
      sourceVideo,
      allVideos,
      limit,
    );

    return contentResults.map((r) => ({
      ...r,
      reasons: [`Because you watched "${sourceVideo.title}"`, ...r.reasons.slice(0, 1)],
    }));
  }
}
