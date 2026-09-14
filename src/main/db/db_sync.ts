import { DBData } from "./types";
import { EncryptedSQLiteEngine } from "../encrypted_sqlite";

export class DBSyncManager {
  constructor(
    private data: DBData,
    private sqliteEngine: EncryptedSQLiteEngine,
    private initDefaults: () => void,
  ) {}

  public syncToEncryptedSqlite(): void {
    if (!this.sqliteEngine.isUnlocked()) return;
    const rawDb = this.sqliteEngine.getRawDb();

    rawDb.run("BEGIN TRANSACTION;");
    try {
      // Sync App State
      rawDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)", [
        "masterPasswordHash",
        this.data.masterPasswordHash || "",
      ]);
      rawDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)", [
        "analytics",
        JSON.stringify(this.data.analytics),
      ]);
      if (this.data.lastImportDirectory) {
        rawDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)", [
          "lastImportDirectory",
          this.data.lastImportDirectory,
        ]);
      }

      // Sync Videos
      for (const v of Object.values(this.data.videos)) {
        rawDb.run(
          `INSERT OR REPLACE INTO videos (
            id, title, duration, resolution, tags, bundle_path, created_at, play_count, last_watched_at, file_size
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            v.id,
            v.title,
            v.duration,
            v.resolution,
            JSON.stringify(v.tags || []),
            v.bundlePath,
            v.createdAt,
            v.playCount || 0,
            v.lastWatchedAt || null,
            v.fileSize || 0,
          ],
        );
      }

      // Sync Playlists
      for (const p of Object.values(this.data.playlists)) {
        rawDb.run(
          `INSERT OR REPLACE INTO playlists (
            id, name, is_default, video_ids, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
          [p.id, p.name, p.isDefault ? 1 : 0, JSON.stringify(p.videoIds || []), p.createdAt],
        );
      }

      // Sync Tag Metadata
      if (this.data.tagMetadata) {
        for (const [tag, meta] of Object.entries(this.data.tagMetadata)) {
          rawDb.run(
            `INSERT OR REPLACE INTO tag_metadata (tag, color, category) VALUES (?, ?, ?)`,
            [tag, meta.color, meta.category || ""],
          );
        }
      }

      // Sync Category Colors
      if (this.data.categoryColors) {
        for (const [cat, col] of Object.entries(this.data.categoryColors)) {
          rawDb.run(
            `INSERT OR REPLACE INTO category_colors (category, color) VALUES (?, ?)`,
            [cat, col],
          );
        }
      }

      rawDb.run("COMMIT;");
      this.sqliteEngine.saveEncrypted();
    } catch (err) {
      rawDb.run("ROLLBACK;");
      throw err;
    }
  }

  public loadFromEncryptedSqlite(): void {
    if (!this.sqliteEngine.isUnlocked()) return;
    const rawDb = this.sqliteEngine.getRawDb();

    // 1. App State
    try {
      const appStateStmt = rawDb.prepare("SELECT key, value FROM app_state");
      while (appStateStmt.step()) {
        const row = appStateStmt.getAsObject() as { key: string; value: string };
        if (row.key === "masterPasswordHash") {
          this.data.masterPasswordHash = row.value || null;
        } else if (row.key === "analytics") {
          try {
            this.data.analytics = JSON.parse(row.value);
          } catch {}
        } else if (row.key === "lastImportDirectory") {
          this.data.lastImportDirectory = row.value || undefined;
        }
      }
      appStateStmt.free();
    } catch {}

    // 2. Videos
    try {
      const videosStmt = rawDb.prepare(
        "SELECT id, title, duration, resolution, tags, bundle_path, created_at, play_count, last_watched_at, file_size FROM videos",
      );
      this.data.videos = {};
      const collectedTags = new Set<string>();

      while (videosStmt.step()) {
        const row = videosStmt.getAsObject() as any;
        let tagsArr: string[] = [];
        try {
          tagsArr = JSON.parse(row.tags || "[]");
        } catch {
          tagsArr = [];
        }
        tagsArr.forEach((t) => collectedTags.add(t));

        this.data.videos[row.id] = {
          id: row.id,
          title: row.title,
          duration: row.duration,
          resolution: row.resolution,
          tags: tagsArr,
          bundlePath: row.bundle_path,
          createdAt: row.created_at,
          playCount: row.play_count || 0,
          lastWatchedAt: row.last_watched_at || undefined,
          fileSize: row.file_size || undefined,
        };
      }
      videosStmt.free();

      // 3. Playlists
      const playlistsStmt = rawDb.prepare(
        "SELECT id, name, is_default, video_ids, created_at FROM playlists",
      );
      this.data.playlists = {};
      while (playlistsStmt.step()) {
        const row = playlistsStmt.getAsObject() as any;
        let videoIdsArr: string[] = [];
        try {
          videoIdsArr = JSON.parse(row.video_ids || "[]");
        } catch {
          videoIdsArr = [];
        }
        this.data.playlists[row.id] = {
          id: row.id,
          name: row.name,
          isDefault: Boolean(row.is_default),
          videoIds: videoIdsArr,
          createdAt: row.created_at,
        };
      }
      playlistsStmt.free();

      // 4. Tag Metadata
      const tagMetaStmt = rawDb.prepare("SELECT tag, color, category FROM tag_metadata");
      this.data.tagMetadata = {};
      while (tagMetaStmt.step()) {
        const row = tagMetaStmt.getAsObject() as any;
        collectedTags.add(row.tag);
        this.data.tagMetadata[row.tag] = {
          color: row.color,
          category: row.category || "",
        };
      }
      tagMetaStmt.free();

      // 5. Category Colors
      const catColorStmt = rawDb.prepare("SELECT category, color FROM category_colors");
      this.data.categoryColors = {};
      while (catColorStmt.step()) {
        const row = catColorStmt.getAsObject() as any;
        this.data.categoryColors[row.category] = row.color;
      }
      catColorStmt.free();

      this.data.tags = Array.from(collectedTags);
      this.initDefaults();
    } catch (err) {
      console.error("Error loading state from encrypted SQLite:", err);
    }
  }
}
