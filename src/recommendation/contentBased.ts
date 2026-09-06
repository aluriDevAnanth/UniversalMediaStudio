import { Video, RecommendationResult } from "./types";

export class ContentBasedRecommender {
  private categoryWeights: Record<string, number> = {
    Series: 3.5,
    Franchise: 3.0,
    Director: 2.5,
    Actor: 2.2,
    Genre: 2.0,
    Topic: 1.8,
    Mood: 1.5,
    Format: 1.2,
    General: 1.0,
  };

  /**
   * Build video feature vectors from title, tags, and category metadata
   */
  public buildFeatureVector(video: Video): Map<string, number> {
    const features = new Map<string, number>();

    // Title tokens
    const titleTokens = this.tokenize(video.title);
    titleTokens.forEach((token) => {
      features.set(`title:${token}`, (features.get(`title:${token}`) || 0) + 1.2);
    });

    // Tags with category-aware weighting
    (video.tags || []).forEach((tag) => {
      const parts = tag.split(":");
      const category = parts.length > 1 ? parts[0].trim() : "General";
      const name = parts.length > 1 ? parts.slice(1).join(":").trim() : tag.trim();

      const weight = this.getCategoryWeight(category);
      features.set(`tag:${tag.toLowerCase()}`, (features.get(`tag:${tag.toLowerCase()}`) || 0) + weight);
      features.set(`cat:${category.toLowerCase()}`, (features.get(`cat:${category.toLowerCase()}`) || 0) + weight * 0.5);
      features.set(`name:${name.toLowerCase()}`, (features.get(`name:${name.toLowerCase()}`) || 0) + weight * 0.8);
    });

    return features;
  }

  public tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  public getCategoryWeight(category: string): number {
    return this.categoryWeights[category] || 1.0;
  }

  /**
   * Calculate cosine similarity between two videos
   */
  public calculateSimilarity(videoA: Video, videoB: Video): number {
    const featuresA = this.buildFeatureVector(videoA);
    const featuresB = this.buildFeatureVector(videoB);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const [key, value] of featuresA) {
      dotProduct += value * (featuresB.get(key) || 0);
      normA += value * value;
    }

    for (const value of featuresB.values()) {
      normB += value * value;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public calculateTagOverlap(tagsA: string[] = [], tagsB: string[] = []): number {
    if (!tagsA.length || !tagsB.length) return 0;
    const setA = new Set(tagsA.map((t) => t.toLowerCase()));
    const setB = new Set(tagsB.map((t) => t.toLowerCase()));
    let intersection = 0;
    setA.forEach((t) => {
      if (setB.has(t)) intersection++;
    });
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  public calculateCategoryMatch(tagsA: string[] = [], tagsB: string[] = []): number {
    if (!tagsA.length || !tagsB.length) return 0;
    const categoriesA = new Set(tagsA.map((t) => t.split(":")[0].toLowerCase()));
    const categoriesB = new Set(tagsB.map((t) => t.split(":")[0].toLowerCase()));
    let intersection = 0;
    categoriesA.forEach((c) => {
      if (categoriesB.has(c)) intersection++;
    });
    return categoriesA.size === 0 ? 0 : intersection / categoriesA.size;
  }

  /**
   * Get content-based recommendations relative to a source video
   */
  public getRecommendations(
    sourceVideo: Video,
    allVideos: Video[],
    limit: number = 20,
  ): RecommendationResult[] {
    const scores: { video: Video; score: number; reasons: string[] }[] = [];

    for (const video of allVideos) {
      if (video.id === sourceVideo.id) continue;

      const titleSim = this.calculateSimilarity(sourceVideo, video);
      const tagOverlap = this.calculateTagOverlap(sourceVideo.tags, video.tags);
      const categoryMatch = this.calculateCategoryMatch(sourceVideo.tags, video.tags);

      const score = titleSim * 0.45 + tagOverlap * 0.35 + categoryMatch * 0.2;

      if (score > 0.05) {
        const reasons: string[] = [];
        if (tagOverlap > 0.3) reasons.push("Shared tags and genre");
        if (titleSim > 0.3) reasons.push("Similar title & franchise");
        if (categoryMatch > 0.5) reasons.push("Matching category");
        if (reasons.length === 0) reasons.push("Content similarity");

        scores.push({ video, score, reasons });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ video, score, reasons }) => ({
        video,
        score,
        reasons: reasons.slice(0, 3),
        source: "content",
      }));
  }
}
