import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { Database } from "../src/main/db";

describe("Database & Local Store Operations", () => {
  let tempDbPath: string;
  let db: Database;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "db_test_"));
    tempDbPath = path.join(tempDir, "test_store.json");
    db = new Database(tempDbPath);
  });

  afterEach(() => {
    const tempDir = path.dirname(tempDbPath);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should initialize with default playlists", () => {
    const playlists = db.getPlaylists();
    expect(playlists.length).toBeGreaterThanOrEqual(2);
    expect(playlists.some((p) => p.id === "watch_later")).toBe(true);
    expect(playlists.some((p) => p.id === "favourite")).toBe(true);
  });

  it("should set and verify master password with bcrypt", () => {
    expect(db.isPasswordSet()).toBe(false);
    expect(db.verifyMasterPassword("WrongPass")).toBe(false);

    db.setMasterPassword("Secret123!");
    expect(db.isPasswordSet()).toBe(true);
    expect(db.verifyMasterPassword("Secret123!")).toBe(true);
    expect(db.verifyMasterPassword("WrongPass")).toBe(false);
  });

  it("should perform video CRUD operations properly", () => {
    const video = {
      id: "vid_test_1",
      title: "Inception Trailer",
      duration: 148,
      resolution: "1920x1080",
      tags: ["Director:Christopher Nolan", "Genre:Sci-Fi"],
      bundlePath: "/bundles/inception.adaumc",
      createdAt: new Date().toISOString(),
      playCount: 0,
      fileSize: 10485760,
    };

    db.saveVideo(video);

    const fetched = db.getVideo("vid_test_1");
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe("Inception Trailer");

    db.incrementPlayCount("vid_test_1");
    const afterPlay = db.getVideo("vid_test_1");
    expect(afterPlay?.playCount).toBe(1);

    db.deleteVideo("vid_test_1");
    expect(db.getVideo("vid_test_1")).toBeUndefined();
  });

  it("should handle playlist creation and video toggling", () => {
    const pl = db.createPlaylist("Cyberpunk Vids");
    expect(pl.name).toBe("Cyberpunk Vids");

    db.toggleVideoInPlaylist(pl.id, "vid_100");
    let updated = db.getPlaylists().find((p) => p.id === pl.id);
    expect(updated?.videoIds).toContain("vid_100");

    db.toggleVideoInPlaylist(pl.id, "vid_100");
    updated = db.getPlaylists().find((p) => p.id === pl.id);
    expect(updated?.videoIds).not.toContain("vid_100");

    db.deletePlaylist(pl.id);
    expect(db.getPlaylists().some((p) => p.id === pl.id)).toBe(false);
  });

  it("should handle tag metadata and category colors", () => {
    db.addTag("Genre:Horror", "#f43f5e", "Genre");
    const tags = db.getTags();
    expect(tags).toContain("Genre:Horror");

    const meta = db.getTagMetadata();
    expect(meta["Genre:Horror"]).toBeDefined();

    db.setCategoryColor("Genre", "#ff0055");
    const catColors = db.getCategoryColors();
    expect(catColors["Genre"]).toBe("#ff0055");

    db.deleteTag("Genre:Horror");
    expect(db.getTags()).not.toContain("Genre:Horror");
  });
});
