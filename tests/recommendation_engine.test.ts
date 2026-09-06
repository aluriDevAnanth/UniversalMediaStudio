import { describe, it, expect } from "bun:test";
import { Video, UserContext } from "../src/recommendation/types";
import { ContentBasedRecommender } from "../src/recommendation/contentBased";
import { CollaborativeRecommender } from "../src/recommendation/collaborative";
import { ContextAwareRecommender } from "../src/recommendation/contextAware";
import { RecommendationEngine } from "../src/recommendation/engine";

const sampleVideos: Video[] = [
  {
    id: "v1",
    title: "Inception Christopher Nolan Sci-Fi Thriller",
    tags: ["Director:Nolan", "Genre:Sci-Fi", "Actor:DiCaprio", "Series:MindBenders"],
    playCount: 15,
    duration: 8800,
    lastWatchedAt: new Date(),
  },
  {
    id: "v2",
    title: "Interstellar Christopher Nolan Space Odyssey",
    tags: ["Director:Nolan", "Genre:Sci-Fi", "Actor:McConaughey", "Series:MindBenders"],
    playCount: 10,
    duration: 9500,
    lastWatchedAt: new Date(Date.now() - 3600 * 1000 * 5),
  },
  {
    id: "v3",
    title: "The Dark Knight Christopher Nolan Action Batman",
    tags: ["Director:Nolan", "Genre:Action", "Actor:Bale", "Franchise:Batman"],
    playCount: 20,
    duration: 9000,
    lastWatchedAt: new Date(Date.now() - 3600 * 1000 * 24),
  },
  {
    id: "v4",
    title: "Pulp Fiction Quentin Tarantino Crime Masterpiece",
    tags: ["Director:Tarantino", "Genre:Crime", "Actor:Travolta"],
    playCount: 1,
    duration: 9200,
    lastWatchedAt: new Date(Date.now() - 3600 * 1000 * 72),
  },
  {
    id: "v5",
    title: "Quick React Tutorial for Beginners",
    tags: ["Topic:Programming", "Genre:Education", "Format:Tutorial"],
    playCount: 0,
    duration: 300,
  },
];

describe("Video Recommendation Engine", () => {
  describe("ContentBasedRecommender", () => {
    const contentRecommender = new ContentBasedRecommender();

    it("should compute high similarity between videos sharing director and genre", () => {
      const sim12 = contentRecommender.calculateSimilarity(sampleVideos[0], sampleVideos[1]);
      const sim14 = contentRecommender.calculateSimilarity(sampleVideos[0], sampleVideos[3]);

      expect(sim12).toBeGreaterThan(sim14);
      expect(sim12).toBeGreaterThan(0.5);
    });

    it("should calculate tag overlap and category match accurately", () => {
      const overlap = contentRecommender.calculateTagOverlap(
        sampleVideos[0].tags,
        sampleVideos[1].tags,
      );
      expect(overlap).toBeGreaterThan(0.3);

      const catMatch = contentRecommender.calculateCategoryMatch(
        sampleVideos[0].tags,
        sampleVideos[1].tags,
      );
      expect(catMatch).toBeGreaterThanOrEqual(0.75);
    });

    it("should return content recommendations sorted by relevance", () => {
      const recs = contentRecommender.getRecommendations(sampleVideos[0], sampleVideos, 5);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].video.id).toBe("v2"); // Interstellar is most similar to Inception
    });
  });

  describe("CollaborativeRecommender", () => {
    const context: UserContext = {
      searchQuery: "",
      selectedTags: [],
      playlists: {
        favourite: ["v1", "v2"],
        watch_later: ["v3"],
      },
      allVideos: sampleVideos,
      watchHistory: [
        {
          videoId: "v1",
          timestamp: new Date(),
          watchDuration: 8800,
          completed: true,
          seekCount: 4,
        },
      ],
    };

    it("should build user preference profile and recommend related unwatched content", () => {
      const collabRecommender = new CollaborativeRecommender(context);
      const recs = collabRecommender.getRecommendations(sampleVideos, 5);

      expect(recs.length).toBeGreaterThan(0);
      // High Nolan / Action / Sci-Fi preference should rank v3 or v2 high
      const topIds = recs.map((r) => r.video.id);
      expect(topIds).toContain("v3");
    });
  });

  describe("ContextAwareRecommender", () => {
    it("should boost videos matching active search query and selected filters", () => {
      const context: UserContext = {
        searchQuery: "Nolan Batman",
        selectedTags: ["Franchise:Batman"],
        playlists: {},
        allVideos: sampleVideos,
      };

      const contextRecommender = new ContextAwareRecommender(context);
      const recs = contextRecommender.getRecommendations(sampleVideos, 5);

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].video.id).toBe("v3"); // The Dark Knight
    });
  });

  describe("RecommendationEngine (Hybrid & Diversity)", () => {
    const context: UserContext = {
      searchQuery: "Nolan",
      selectedTags: ["Genre:Sci-Fi"],
      playlists: {
        favourite: ["v1"],
      },
      allVideos: sampleVideos,
      watchHistory: [
        {
          videoId: "v1",
          timestamp: new Date(),
          watchDuration: 8000,
          completed: true,
          seekCount: 2,
        },
      ],
    };

    it("should blend multiple recommendation streams and return diverse results", () => {
      const engine = new RecommendationEngine(context);
      const recs = engine.getRecommendations("v1", 10);

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].reasons.length).toBeGreaterThan(0);
    });

    it("should return trending videos based on recent watches and play count", () => {
      const engine = new RecommendationEngine(context);
      const trending = engine.getTrendingVideos(5);

      expect(trending.length).toBeGreaterThan(0);
      // v1 or v3 has highest play count & recent watch
      expect(["v1", "v2", "v3"]).toContain(trending[0].video.id);
    });

    it("should generate 'Because you watched' recommendations", () => {
      const engine = new RecommendationEngine(context);
      const becauseWatched = engine.getBecauseYouWatched("v1", 3);

      expect(becauseWatched.length).toBeGreaterThan(0);
      expect(becauseWatched[0].reasons[0]).toContain("Because you watched");
    });
  });
});
