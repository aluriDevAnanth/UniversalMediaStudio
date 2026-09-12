import { describe, it, expect } from "bun:test";
import { RecommendationCache } from "../src/recommendation/cache";
import { CollaborativeRecommender } from "../src/recommendation/collaborative";
import { ContentBasedRecommender } from "../src/recommendation/contentBased";
import { ContextAwareRecommender } from "../src/recommendation/contextAware";
import { Video, UserContext } from "../src/recommendation/types";

describe("Deep Recommendation Submodules (src/recommendation/)", () => {
  describe("RecommendationCache (cache.ts)", () => {
    it("should generate deterministic cache keys based on user context", () => {
      const cache = new RecommendationCache();
      const ctx: UserContext = {
        allVideos: [],
        playlists: {},
        searchQuery: "  Action Movie  ",
        selectedTags: ["Genre:Sci-Fi", "Actor:Keanu"],
        sessionStartTime: new Date(),
        currentVideoId: "vid_100",
      };

      const key = cache.getKey(ctx, "personalized", "vid_100");
      expect(key).toContain("rec:personalized:vid_100:action movie:Actor:Keanu,Genre:Sci-Fi:0");
    });

    it("should store and retrieve recommendation entries within TTL", () => {
      const cache = new RecommendationCache(1000); // 1s TTL
      const results = [{ video: { id: "1", title: "Test" } as Video, score: 0.9, reasons: ["Great"], source: "content" as const }];

      cache.set("key1", results);
      expect(cache.get("key1")).toEqual(results);
    });

    it("should expire entries after TTL expires", async () => {
      const cache = new RecommendationCache(20); // 20ms TTL
      const results = [{ video: { id: "1", title: "Test" } as Video, score: 0.9, reasons: ["Great"], source: "content" as const }];

      cache.set("key_expire", results);
      expect(cache.get("key_expire")).toBeDefined();

      await new Promise((r) => setTimeout(r, 30));
      expect(cache.get("key_expire")).toBeUndefined();
    });

    it("should evict oldest key when reaching maxKeys limit", () => {
      const cache = new RecommendationCache(60000, 2); // capacity of 2
      const res = [{ video: { id: "1", title: "T" } as Video, score: 1, reasons: [], source: "content" as const }];

      cache.set("k1", res);
      cache.set("k2", res);
      cache.set("k3", res); // should evict k1

      expect(cache.get("k1")).toBeUndefined();
      expect(cache.get("k2")).toBeDefined();
      expect(cache.get("k3")).toBeDefined();
    });

    it("should clear all entries on invalidateAll()", () => {
      const cache = new RecommendationCache();
      cache.set("a", []);
      cache.set("b", []);
      cache.invalidateAll();

      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("b")).toBeUndefined();
    });
  });

  describe("CollaborativeRecommender (collaborative.ts)", () => {
    const sampleVideos: Video[] = [
      { id: "v1", title: "Interstellar", tags: ["Genre:Sci-Fi", "Director:Nolan"], duration: 10000, playCount: 5 },
      { id: "v2", title: "Inception", tags: ["Genre:Sci-Fi", "Director:Nolan"], duration: 9000, playCount: 1 },
      { id: "v3", title: "The Dark Knight", tags: ["Genre:Action", "Director:Nolan"], duration: 9000, playCount: 0 },
      { id: "v4", title: "Funny Comedy", tags: ["Genre:Comedy"], duration: 90, playCount: 0 },
    ];

    it("should build user preference profile with implicit play counts and boost related content", () => {
      const ctx: UserContext = {
        allVideos: sampleVideos,
        playlists: {
          favourite: ["v1"],
        },
        watchHistory: [
          { videoId: "v1", watchDuration: 9000, completed: true, timestamp: new Date() },
        ],
        sessionStartTime: new Date(),
      };

      const recommender = new CollaborativeRecommender(ctx);
      const recs = recommender.getRecommendations(sampleVideos);

      expect(recs.length).toBeGreaterThan(0);
      const topIds = recs.map((r) => r.video.id);
      expect(topIds).toContain("v2");
      expect(topIds).toContain("v3");
    });
  });

  describe("ContentBasedRecommender (contentBased.ts)", () => {
    const recommender = new ContentBasedRecommender();

    it("should tokenize text and remove punctuation properly", () => {
      const tokens = recommender.tokenize("Spider-Man: Across the Spider-Verse in 4K (2023)!");
      expect(tokens).toContain("spider");
      expect(tokens).toContain("across");
      expect(tokens).toContain("the");
      expect(tokens).toContain("verse");
      expect(tokens).toContain("2023");
      // Tokens <= 2 characters (e.g. 'in', '4k') should be filtered out
      expect(tokens).not.toContain("in");
      expect(tokens).not.toContain("4k");
    });

    it("should return higher category weights for Series and Franchise tags", () => {
      expect(recommender.getCategoryWeight("Series")).toBeGreaterThan(recommender.getCategoryWeight("General"));
      expect(recommender.getCategoryWeight("Director")).toBeGreaterThan(recommender.getCategoryWeight("Mood"));
    });

    it("should calculate tag overlap and category match accurately", () => {
      const tagsA = ["Genre:Action", "Actor:Tom", "Mood:Exciting"];
      const tagsB = ["Genre:Action", "Actor:Tom", "Mood:Dark"];
      const overlap = recommender.calculateTagOverlap(tagsA, tagsB);
      expect(overlap).toBeCloseTo(2 / 4); // 2 shared, 4 union

      const catMatch = recommender.calculateCategoryMatch(tagsA, tagsB);
      expect(catMatch).toBe(1.0); // All 3 categories exist in both
    });
  });

  describe("ContextAwareRecommender (contextAware.ts)", () => {
    const sampleVideos: Video[] = [
      { id: "v1", title: "JavaScript Tutorial for Beginners", tags: ["Topic:Education"], duration: 1800 },
      { id: "v2", title: "Avengers: Endgame Action Movie", tags: ["Genre:Action", "Mood:Exciting"], duration: 7200 },
      { id: "v3", title: "Short Comedy Clip", tags: ["Genre:Comedy"], duration: 90 },
    ];

    it("should prioritize videos matching search query", () => {
      const ctx: UserContext = {
        allVideos: sampleVideos,
        playlists: {},
        searchQuery: "JavaScript Beginners",
        selectedTags: [],
        sessionStartTime: new Date(),
      };

      const recommender = new ContextAwareRecommender(ctx);
      const recs = recommender.getRecommendations(sampleVideos);

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].video.id).toBe("v1");
      expect(recs[0].reasons).toContain("Matches your search");
    });

    it("should prioritize videos matching selected tag filters", () => {
      const ctx: UserContext = {
        allVideos: sampleVideos,
        playlists: {},
        searchQuery: "",
        selectedTags: ["Genre:Comedy"],
        sessionStartTime: new Date(),
      };

      const recommender = new ContextAwareRecommender(ctx);
      const recs = recommender.getRecommendations(sampleVideos);

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].video.id).toBe("v3");
      expect(recs[0].reasons).toContain("Matches selected filters");
    });
  });
});
