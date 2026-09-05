import { describe, it, expect } from "bun:test";
import {
  calculateRelevanceScore,
  sortVideosByRelevance,
} from "../src/renderer/src/utils/relevanceScoring";
import { VideoRecord, PlaylistRecord } from "../src/renderer/src/env";

describe("Relevance Scoring & Recommendation Engine", () => {
  const sampleVideos: VideoRecord[] = [
    {
      id: "vid_1",
      title: "The Matrix Reloaded Action Trailer",
      duration: 150,
      resolution: "4K",
      tags: ["Series:Matrix", "Genre:Sci-Fi", "Actor:Keanu Reeves"],
      bundlePath: "/bundles/vid_1.adaumc",
      createdAt: new Date().toISOString(),
      playCount: 15,
    },
    {
      id: "vid_2",
      title: "Interstellar Space Voyage",
      duration: 180,
      resolution: "1080p",
      tags: ["Genre:Sci-Fi", "Director:Christopher Nolan"],
      bundlePath: "/bundles/vid_2.adaumc",
      createdAt: new Date().toISOString(),
      playCount: 1,
    },
    {
      id: "vid_3",
      title: "Nature Documentary: Deep Oceans",
      duration: 60,
      resolution: "720p",
      tags: ["Genre:Documentary", "Topic:Nature"],
      bundlePath: "/bundles/vid_3.adaumc",
      createdAt: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(),
      playCount: 0,
    },
  ];

  const playlists: PlaylistRecord[] = [
    {
      id: "favourite",
      name: "Favorites",
      isDefault: true,
      videoIds: ["vid_2"],
      createdAt: new Date().toISOString(),
    },
  ];

  it("should calculate higher relevance score for videos matching search terms", () => {
    const score1 = calculateRelevanceScore(sampleVideos[0], {
      searchQuery: "Matrix Reloaded",
    });
    const score3 = calculateRelevanceScore(sampleVideos[2], {
      searchQuery: "Matrix Reloaded",
    });

    expect(score1).toBeGreaterThan(score3);
  });

  it("should boost relevance score for videos matching tag filters with category weighting", () => {
    const scoreSciFi = calculateRelevanceScore(sampleVideos[0], {
      selectedTags: ["Genre:Sci-Fi"],
    });
    const scoreNature = calculateRelevanceScore(sampleVideos[2], {
      selectedTags: ["Genre:Sci-Fi"],
    });

    expect(scoreSciFi).toBeGreaterThan(scoreNature);
  });

  it("should boost relevance for videos in favorites or curated playlists", () => {
    const scoreFav = calculateRelevanceScore(sampleVideos[1], { playlists });
    const scoreNonFav = calculateRelevanceScore(sampleVideos[1], { playlists: [] });

    expect(scoreFav).toBeGreaterThan(scoreNonFav);
  });

  it("should sort an array of videos by relevance in descending order", () => {
    const sorted = sortVideosByRelevance(sampleVideos, {
      searchQuery: "Sci-Fi",
      playlists,
    });

    expect(sorted.length).toBe(3);
    // Matrix and Interstellar have Sci-Fi tags and should be ahead of Documentary
    expect(sorted[0].tags.some((t) => t.includes("Sci-Fi"))).toBe(true);
    expect(sorted[sorted.length - 1].id).toBe("vid_3");
  });
});
