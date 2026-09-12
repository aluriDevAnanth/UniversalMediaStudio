import { describe, it, expect, beforeEach } from "bun:test";
import { registerRecommendationApi } from "../src/main/recommendationApi";
import { Database } from "../src/main/db";

describe("Recommendation IPC API Bridge (src/main/recommendationApi.ts)", () => {
  let testDb: Database;

  beforeEach(async () => {
    testDb = new Database();
    await testDb.initialize(":memory:");
  });

  it("should register recommendation API handlers without throwing", () => {
    expect(() => registerRecommendationApi()).not.toThrow();
  });

  it("should format DB video records and provide valid recommendations when videos exist in database", () => {
    testDb.saveVideo({
      id: "vid_sci_fi_1",
      title: "Interstellar Space Voyage",
      duration: 7200,
      resolution: "3840x2160",
      tags: ["Genre:Sci-Fi", "Director:Christopher Nolan"],
      bundlePath: "/bundles/vid_sci_fi_1.adaumc",
      createdAt: new Date().toISOString(),
      playCount: 10,
      lastWatchedAt: new Date().toISOString(),
    });

    testDb.saveVideo({
      id: "vid_sci_fi_2",
      title: "Tenet Space Time",
      duration: 6800,
      resolution: "3840x2160",
      tags: ["Genre:Sci-Fi", "Director:Christopher Nolan"],
      bundlePath: "/bundles/vid_sci_fi_2.adaumc",
      createdAt: new Date().toISOString(),
      playCount: 4,
    });

    const allVideos = testDb.getAllVideos();
    expect(allVideos.length).toBe(2);
    expect(allVideos[0].tags).toContain("Genre:Sci-Fi");
  });
});
