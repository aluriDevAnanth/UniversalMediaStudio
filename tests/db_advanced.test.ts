import { describe, it, expect, beforeEach } from "bun:test";
import { Database, VideoRecord, PlaylistRecord } from "../src/main/db";

describe("Database Advanced Operations & State Management (src/main/db.ts)", () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database();
    await db.initialize(":memory:");
  });

  it("should increment play count and record lastWatched timestamp", () => {
    const video: VideoRecord = {
      id: "vid_play_test",
      title: "Play Count Video",
      duration: 180,
      resolution: "1080p",
      tags: ["Topic:Testing"],
      bundlePath: "/bundles/vid_play_test.adaumc",
      createdAt: new Date().toISOString(),
      playCount: 0,
    };
    db.saveVideo(video);

    expect(db.getVideo("vid_play_test")?.playCount).toBe(0);

    db.incrementPlayCount("vid_play_test");
    const updated1 = db.getVideo("vid_play_test");
    expect(updated1?.playCount).toBe(1);
    expect(updated1?.lastWatchedAt).toBeDefined();

    db.incrementPlayCount("vid_play_test");
    const updated2 = db.getVideo("vid_play_test");
    expect(updated2?.playCount).toBe(2);
  });

  it("should update tags and delete video records completely", () => {
    const video: VideoRecord = {
      id: "vid_tag_update",
      title: "Tag Update Video",
      duration: 60,
      resolution: "720p",
      tags: ["OldTag"],
      bundlePath: "/bundles/vid_tag_update.adaumc",
      createdAt: new Date().toISOString(),
    };
    db.saveVideo(video);

    db.updateVideoTags("vid_tag_update", ["Genre:Comedy", "Actor:Jim"]);
    const fetched = db.getVideo("vid_tag_update");
    expect(fetched?.tags).toEqual(["Genre:Comedy", "Actor:Jim"]);

    db.deleteVideo("vid_tag_update");
    expect(db.getVideo("vid_tag_update")).toBeUndefined();
  });

  it("should manage playlists (create, toggle videos, delete)", () => {
    const pl = db.createPlaylist("Favorites Test");
    expect(pl.name).toBe("Favorites Test");
    expect(pl.videoIds).toEqual([]);

    // Toggle video into playlist
    db.toggleVideoInPlaylist(pl.id, "vid_101");
    let currentPl = db.getPlaylists().find((p) => p.id === pl.id);
    expect(currentPl?.videoIds).toContain("vid_101");

    // Toggle video out of playlist
    db.toggleVideoInPlaylist(pl.id, "vid_101");
    currentPl = db.getPlaylists().find((p) => p.id === pl.id);
    expect(currentPl?.videoIds).not.toContain("vid_101");

    // Delete playlist
    db.deletePlaylist(pl.id);
    expect(db.getPlaylists().find((p) => p.id === pl.id)).toBeUndefined();
  });

  it("should manage category color custom overrides", () => {
    db.setCategoryColor("Anime", "#FF00FF");
    const colors = db.getCategoryColors();
    expect(colors["Anime"]).toBe("#FF00FF");
  });
});
