import { Video, UserContext, RecommendationResult } from "./types";

export class ContextAwareRecommender {
  private context: UserContext;

  constructor(context: UserContext) {
    this.context = context;
  }

  public getRecommendations(
    allVideos: Video[],
    limit: number = 20,
  ): RecommendationResult[] {
    const scores: { video: Video; score: number; reasons: string[] }[] = [];

    for (const video of allVideos) {
      let score = 0;
      const reasons: string[] = [];

      // 1. Search query relevance
      if (this.context.searchQuery && this.context.searchQuery.trim()) {
        const queryScore = this.calculateSearchRelevance(video, this.context.searchQuery);
        if (queryScore > 0) {
          score += queryScore * 4.0;
          reasons.push("Matches your search");
        }
      }

      // 2. Selected filter tags
      if (this.context.selectedTags && this.context.selectedTags.length > 0) {
        const tagScore = this.calculateTagFilterScore(video, this.context.selectedTags);
        if (tagScore > 0) {
          score += tagScore * 3.0;
          reasons.push("Matches selected filters");
        }
      }

      // 3. Recently watched / current video similarity
      if (this.context.currentVideoId) {
        const currentVideo = allVideos.find((v) => v.id === this.context.currentVideoId);
        if (currentVideo && currentVideo.id !== video.id) {
          const recencyScore = this.calculateRecencySimilarity(video, currentVideo);
          score += recencyScore * 2.0;
          if (recencyScore > 0.4) {
            reasons.push("Similar to currently playing");
          }
        }
      }

      // 4. Session time-of-day context
      const sessionScore = this.calculateSessionContextScore(video);
      score += sessionScore * 1.0;

      if (score > 0.1) {
        scores.push({
          video,
          score,
          reasons: reasons.length > 0 ? reasons : ["Contextually relevant"],
        });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ video, score, reasons }) => ({
        video,
        score,
        reasons: reasons.slice(0, 3),
        source: "context",
      }));
  }

  private calculateSearchRelevance(video: Video, query: string): number {
    const terms = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

    if (terms.length === 0) return 0;
    const titleLower = video.title.toLowerCase();
    const tagsLower = (video.tags || []).map((t) => t.toLowerCase());

    let matchCount = 0;
    for (const term of terms) {
      if (titleLower.includes(term)) matchCount += 1.0;
      else if (tagsLower.some((t) => t.includes(term))) matchCount += 0.8;
    }

    return Math.min(1.0, matchCount / terms.length);
  }

  private calculateTagFilterScore(video: Video, selectedTags: string[]): number {
    if (!selectedTags.length) return 0;
    const videoTags = new Set((video.tags || []).map((t) => t.toLowerCase()));
    let matches = 0;

    for (const tag of selectedTags) {
      if (videoTags.has(tag.toLowerCase())) {
        matches++;
      }
    }

    return matches / selectedTags.length;
  }

  private calculateRecencySimilarity(videoA: Video, videoB: Video): number {
    const tagsA = new Set((videoA.tags || []).map((t) => t.toLowerCase()));
    const tagsB = new Set((videoB.tags || []).map((t) => t.toLowerCase()));
    let intersection = 0;
    tagsA.forEach((t) => {
      if (tagsB.has(t)) intersection++;
    });
    const union = new Set([...tagsA, ...tagsB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  private calculateSessionContextScore(video: Video): number {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    let score = 0;
    const tagsStr = (video.tags || []).join(" ").toLowerCase();

    // Time-based context
    if (hour >= 6 && hour < 12) {
      if (tagsStr.includes("education") || tagsStr.includes("tutorial") || tagsStr.includes("doc")) {
        score += 0.4;
      }
    } else if (hour >= 18 && hour < 23) {
      if (tagsStr.includes("action") || tagsStr.includes("movie") || tagsStr.includes("series") || tagsStr.includes("comedy")) {
        score += 0.4;
      }
    } else if (hour >= 23 || hour < 6) {
      // Late night: prefer shorter or mood/chill content
      if ((video.duration || 600) < 600) {
        score += 0.3;
      }
    }

    // Weekend context
    if (day === 0 || day === 6) {
      if ((video.duration || 0) > 1200) {
        score += 0.3; // Long form content on weekends
      }
    }

    return Math.min(1.0, score);
  }
}
