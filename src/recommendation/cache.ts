import { RecommendationResult, UserContext } from "./types";

interface CacheEntry {
  data: RecommendationResult[];
  expiresAt: number;
}

export class RecommendationCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly maxKeys: number;

  constructor(ttlMs: number = 300_000, maxKeys: number = 500) {
    this.ttlMs = ttlMs;
    this.maxKeys = maxKeys;
  }

  public getKey(context: UserContext, type: string, videoId?: string): string {
    const tags = (context.selectedTags || []).slice().sort().join(",");
    const query = (context.searchQuery || "").trim().toLowerCase();
    const vId = videoId || context.currentVideoId || "global";
    return `rec:${type}:${vId}:${query}:${tags}:${context.allVideos?.length || 0}`;
  }

  public get(key: string): RecommendationResult[] | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  public set(key: string, value: RecommendationResult[]): void {
    if (this.cache.size >= this.maxKeys) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  public invalidateAll(): void {
    this.cache.clear();
  }
}
