import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { getDatabasePath, getLegacyDatabasePath } from "./paths";
import { EncryptedSQLiteEngine } from "./encrypted_sqlite";

export interface VideoRecord {
  id: string;
  title: string;
  duration: number;
  resolution: string;
  tags: string[];
  bundlePath: string;
  createdAt: string;
  playCount: number;
  lastWatchedAt?: string;
  fileSize?: number;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  isDefault: boolean;
  videoIds: string[];
  createdAt: string;
}

export interface AnalyticsRecord {
  totalWatchTimeSeconds: number;
  totalVideosProcessed: number;
  lastProcessingSpeedSeconds: number;
}

export interface TagMetaItem {
  color: string;
  category?: string;
}

interface DBData {
  masterPasswordHash: string | null;
  videos: Record<string, VideoRecord>;
  playlists: Record<string, PlaylistRecord>;
  tags: string[];
  tagMetadata?: Record<string, TagMetaItem>;
  categoryColors?: Record<string, string>;
  analytics: AnalyticsRecord;
  lastImportDirectory?: string;
}

export class Database {
  private dbPath: string;
  private sqliteEngine: EncryptedSQLiteEngine;
  private data: DBData;
  private activeMasterPassword: string | null = null;

  private isCustomPath = false;

  constructor(customDbPath?: string) {
    this.isCustomPath = !!customDbPath;
    this.dbPath = customDbPath || getDatabasePath();
    const sqlitePath = this.dbPath.endsWith(".enc") ? this.dbPath : `${this.dbPath}.enc`;
    this.sqliteEngine = new EncryptedSQLiteEngine(sqlitePath);
    this.data = this.loadLegacyOrDefaults();
    this.initDefaults();
    this.cleanGenericTags();

    // Auto-initialize encrypted SQLite container in background if not in custom JSON test mode
    if (!this.isCustomPath || this.dbPath.endsWith(".enc")) {
      this.initialize().catch((err) => {
        console.error("Failed to auto-initialize encrypted SQLite container:", err);
      });
    }
  }

  public async initialize(): Promise<void> {
    try {
      const unlocked = await this.sqliteEngine.autoInitialize();
      if (unlocked) {
        this.loadFromEncryptedSqlite();
        // If legacy JSON exists, sync into encrypted container and remove JSON
        if (!this.isCustomPath) {
          const legacyPath = getLegacyDatabasePath();
          if (fs.existsSync(legacyPath)) {
            this.syncToEncryptedSqlite();
            try {
              fs.unlinkSync(legacyPath);
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Error during DB initialization:", err);
    }
  }

  private cleanGenericTags(): void {
    const genericTags = ["Action", "Sci-Fi", "Nature", "Tutorial", "Music"];
    const hasGeneric = this.data.tags.some((t) => genericTags.includes(t));

    if (hasGeneric) {
      this.data.tags = this.data.tags.filter((t) => !genericTags.includes(t));
      for (const v of Object.values(this.data.videos)) {
        v.tags = v.tags.filter((t) => !genericTags.includes(t));
      }
      this.save();
    }
  }

  private loadLegacyOrDefaults(): DBData {
    const loadPath = this.dbPath.endsWith(".json") ? this.dbPath : getLegacyDatabasePath();
    if (fs.existsSync(loadPath)) {
      try {
        const raw = fs.readFileSync(loadPath, "utf-8");
        return JSON.parse(raw);
      } catch (err) {
        console.error("Failed to parse DB file, using defaults", err);
      }
    }

    // Fallback: Check AppData location if migrating to portable mode for the first time (only in non-test mode)
    if (!this.isCustomPath) {
      const appDataFallback = path.join(
        require("os").homedir(),
        "AppData",
        "Roaming",
        "UniversalMediaStudio",
        "mediahub_store.json"
      );
      if (fs.existsSync(appDataFallback)) {
        try {
          const raw = fs.readFileSync(appDataFallback, "utf-8");
          return JSON.parse(raw);
        } catch {}
      }
    }
    return {
      masterPasswordHash: null,
      videos: {},
      playlists: {},
      tags: [],
      analytics: {
        totalWatchTimeSeconds: 0,
        totalVideosProcessed: 0,
        lastProcessingSpeedSeconds: 0,
      },
    };
  }

  private save(): void {
    // 1. Sync to active encrypted SQLite container if unlocked (default machine key or custom password)
    if (this.sqliteEngine.isUnlocked()) {
      try {
        this.syncToEncryptedSqlite();
      } catch (err) {
        console.error("Error syncing to encrypted SQLite DB:", err);
      }
    }

    // Only persist JSON if running in custom JSON test mode
    if (this.isCustomPath && this.dbPath.endsWith(".json")) {
      try {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), "utf-8");
      } catch {}
    }
  }

  private initDefaults(): void {
    // Initialize default playlists: watch_later and favourite
    if (!this.data.playlists["watch_later"]) {
      this.data.playlists["watch_later"] = {
        id: "watch_later",
        name: "Watch Later",
        isDefault: true,
        videoIds: [],
        createdAt: new Date().toISOString(),
      };
    }
    if (!this.data.playlists["favourite"]) {
      this.data.playlists["favourite"] = {
        id: "favourite",
        name: "Favourite",
        isDefault: true,
        videoIds: [],
        createdAt: new Date().toISOString(),
      };
    }
    this.save();
  }

  /**
   * Sync active memory state into Encrypted SQLite database tables
   */
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
          ]
        );
      }

      // Sync Playlists
      for (const p of Object.values(this.data.playlists)) {
        rawDb.run(
          `INSERT OR REPLACE INTO playlists (
            id, name, is_default, video_ids, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
          [p.id, p.name, p.isDefault ? 1 : 0, JSON.stringify(p.videoIds || []), p.createdAt]
        );
      }

      // Sync Tag Metadata
      if (this.data.tagMetadata) {
        for (const [tag, meta] of Object.entries(this.data.tagMetadata)) {
          rawDb.run(
            `INSERT OR REPLACE INTO tag_metadata (tag, color, category) VALUES (?, ?, ?)`,
            [tag, meta.color, meta.category || ""]
          );
        }
      }

      // Sync Category Colors
      if (this.data.categoryColors) {
        for (const [cat, col] of Object.entries(this.data.categoryColors)) {
          rawDb.run(
            `INSERT OR REPLACE INTO category_colors (category, color) VALUES (?, ?)`,
            [cat, col]
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

  /**
   * Load in-memory state directly from the unlocked encrypted SQLite tables
   */
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
        "SELECT id, title, duration, resolution, tags, bundle_path, created_at, play_count, last_watched_at, file_size FROM videos"
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
        "SELECT id, name, is_default, video_ids, created_at FROM playlists"
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

  // Master Auth methods
  public isPasswordSet(): boolean {
    if (this.sqliteEngine.hasCustomMasterPassword()) {
      return true;
    }
    return !!this.data.masterPasswordHash;
  }

  public async setMasterPassword(password: string): Promise<boolean> {
    const salt = bcrypt.genSaltSync(10);
    this.data.masterPasswordHash = bcrypt.hashSync(password, salt);
    this.activeMasterPassword = password;

    try {
      await this.sqliteEngine.setCustomMasterPassword(password);
      this.syncToEncryptedSqlite();

      // Zero JSON: Remove legacy unencrypted JSON store from disk
      if (!this.isCustomPath) {
        const legacyPath = getLegacyDatabasePath();
        if (fs.existsSync(legacyPath)) {
          try {
            fs.unlinkSync(legacyPath);
          } catch {}
        }
      }
    } catch (e) {
      console.error("Error setting SQLite master password:", e);
    }

    this.save();
    return true;
  }

  public async verifyMasterPassword(password: string): Promise<boolean> {
    // 1. Direct AES-256-GCM unlock if SQLite engine file exists
    if (this.sqliteEngine.exists()) {
      try {
        const unlocked = await this.sqliteEngine.unlockWithPassword(password);
        if (unlocked) {
          this.activeMasterPassword = password;
          this.loadFromEncryptedSqlite();

          // Zero JSON: Remove legacy unencrypted JSON store
          if (!this.isCustomPath) {
            const legacyPath = getLegacyDatabasePath();
            if (fs.existsSync(legacyPath)) {
              try {
                fs.unlinkSync(legacyPath);
              } catch {}
            }
          }
          return true;
        }
      } catch (e) {
        console.error("Error unlocking SQLite vault:", e);
      }
    }

    // 2. Fallback check for legacy in-memory masterPasswordHash
    if (this.data.masterPasswordHash) {
      const match = bcrypt.compareSync(password, this.data.masterPasswordHash);
      if (match) {
        this.activeMasterPassword = password;
        try {
          await this.sqliteEngine.setCustomMasterPassword(password);
          this.syncToEncryptedSqlite();
          if (!this.isCustomPath) {
            const legacyPath = getLegacyDatabasePath();
            if (fs.existsSync(legacyPath)) {
              try {
                fs.unlinkSync(legacyPath);
              } catch {}
            }
          }
        } catch (e) {
          console.error("Error migrating legacy DB to encrypted SQLite:", e);
        }
        return true;
      }
    }

    return false;
  }

  public getEncryptedEngine(): EncryptedSQLiteEngine {
    return this.sqliteEngine;
  }

  public getActiveMasterPassword(): string | null {
    return this.activeMasterPassword;
  }

  // Videos
  public getAllVideos(): VideoRecord[] {
    return Object.values(this.data.videos);
  }

  public getVideo(id: string): VideoRecord | undefined {
    return this.data.videos[id];
  }

  public saveVideo(video: VideoRecord): void {
    this.data.videos[video.id] = video;
    this.data.analytics.totalVideosProcessed += 1;
    this.save();
  }

  public deleteVideo(id: string): boolean {
    const video = this.data.videos[id];
    if (video) {
      if (fs.existsSync(video.bundlePath)) {
        try {
          fs.unlinkSync(video.bundlePath);
        } catch (e) {
          console.error("Error deleting bundle file", e);
        }
      }
      delete this.data.videos[id];
      // Remove from playlists
      for (const p of Object.values(this.data.playlists)) {
        p.videoIds = p.videoIds.filter((vId) => vId !== id);
      }

      if (this.sqliteEngine.isUnlocked()) {
        try {
          const rawDb = this.sqliteEngine.getRawDb();
          rawDb.run("DELETE FROM videos WHERE id = ?", [id]);
          this.sqliteEngine.saveEncrypted();
        } catch {}
      }

      this.save();
      return true;
    }
    return false;
  }

  public incrementPlayCount(id: string): void {
    const v = this.data.videos[id];
    if (v) {
      v.playCount = (v.playCount || 0) + 1;
      v.lastWatchedAt = new Date().toISOString();
      this.save();
    }
  }

  // Playlists
  public getPlaylists(): PlaylistRecord[] {
    return Object.values(this.data.playlists);
  }

  public createPlaylist(name: string): PlaylistRecord {
    const id = "pl_" + Date.now();
    const newPl: PlaylistRecord = {
      id,
      name,
      isDefault: false,
      videoIds: [],
      createdAt: new Date().toISOString(),
    };
    this.data.playlists[id] = newPl;
    this.save();
    return newPl;
  }

  public toggleVideoInPlaylist(
    playlistId: string,
    videoId: string,
  ): PlaylistRecord {
    const pl = this.data.playlists[playlistId];
    if (pl) {
      if (pl.videoIds.includes(videoId)) {
        pl.videoIds = pl.videoIds.filter((id) => id !== videoId);
      } else {
        pl.videoIds.push(videoId);
      }
      this.save();
      return pl;
    }
    throw new Error("Playlist not found");
  }

  public deletePlaylist(playlistId: string): boolean {
    const pl = this.data.playlists[playlistId];
    if (pl && !pl.isDefault) {
      delete this.data.playlists[playlistId];
      if (this.sqliteEngine.isUnlocked()) {
        try {
          const rawDb = this.sqliteEngine.getRawDb();
          rawDb.run("DELETE FROM playlists WHERE id = ?", [playlistId]);
          this.sqliteEngine.saveEncrypted();
        } catch {}
      }
      this.save();
      return true;
    }
    return false;
  }

  // Tags
  public getTags(): string[] {
    return this.data.tags;
  }

  public getCategoryColors(): Record<string, string> {
    if (!this.data.categoryColors) {
      this.data.categoryColors = {};
    }
    return this.data.categoryColors;
  }

  public setCategoryColor(category: string, color: string): Record<string, string> {
    if (!this.data.categoryColors) {
      this.data.categoryColors = {};
    }
    this.data.categoryColors[category] = color;
    this.save();
    return this.data.categoryColors;
  }

  public getTagMetadata(): Record<string, TagMetaItem> {
    if (!this.data.tagMetadata) {
      this.data.tagMetadata = {};
    }
    return this.data.tagMetadata;
  }

  public setTagMetadata(name: string, color: string, category?: string): Record<string, TagMetaItem> {
    if (!this.data.tagMetadata) {
      this.data.tagMetadata = {};
    }
    this.data.tagMetadata[name] = { color, category: category || "" };
    this.save();
    return this.data.tagMetadata;
  }

  public addTag(tag: string, color?: string, category?: string): string[] {
    if (!this.data.tags.includes(tag)) {
      this.data.tags.push(tag);
    }
    if (color || category) {
      if (!this.data.tagMetadata) this.data.tagMetadata = {};
      this.data.tagMetadata[tag] = {
        color: color || "#3b82f6",
        category: category || "",
      };
    }
    this.save();
    return this.data.tags;
  }

  public deleteTag(tag: string): string[] {
    this.data.tags = this.data.tags.filter((t) => t !== tag);
    if (this.data.tagMetadata && this.data.tagMetadata[tag]) {
      delete this.data.tagMetadata[tag];
    }
    for (const v of Object.values(this.data.videos)) {
      v.tags = v.tags.filter((t) => !tag || t !== tag);
    }
    this.save();
    return this.data.tags;
  }

  public renameTag(oldTag: string, newTag: string): string[] {
    const trimmed = newTag.trim();
    if (!trimmed || oldTag === trimmed) return this.data.tags;
    this.data.tags = this.data.tags.map((t) => (t === oldTag ? trimmed : t));
    this.data.tags = Array.from(new Set(this.data.tags));
    if (this.data.tagMetadata && this.data.tagMetadata[oldTag]) {
      this.data.tagMetadata[trimmed] = this.data.tagMetadata[oldTag];
      delete this.data.tagMetadata[oldTag];
    }
    for (const v of Object.values(this.data.videos)) {
      if (v.tags.includes(oldTag)) {
        v.tags = v.tags.map((t) => (t === oldTag ? trimmed : t));
        v.tags = Array.from(new Set(v.tags));
      }
    }
    this.save();
    return this.data.tags;
  }

  public updateVideoTags(videoId: string, tags: string[]): VideoRecord {
    const v = this.data.videos[videoId];
    if (v) {
      v.tags = tags;
      this.save();
      return v;
    }
    throw new Error("Video not found");
  }

  public bulkUpdateVideoTags(
    videoIds: string[],
    addTags: string[],
    removeTags: string[],
  ): VideoRecord[] {
    const updated: VideoRecord[] = [];
    for (const id of videoIds) {
      const v = this.data.videos[id];
      if (v) {
        let set = new Set(v.tags);
        addTags.forEach((t) => set.add(t));
        removeTags.forEach((t) => set.delete(t));
        v.tags = Array.from(set);
        updated.push(v);
      }
    }
    this.save();
    return updated;
  }

  // Analytics
  public getAnalytics() {
    const videos = Object.values(this.data.videos);
    const totalPlayCount = videos.reduce(
      (sum, v) => sum + (v.playCount || 0),
      0,
    );
    const totalStorageBytes = videos.reduce((sum, v) => {
      if (fs.existsSync(v.bundlePath)) {
        return sum + fs.statSync(v.bundlePath).size;
      }
      return sum;
    }, 0);

    const tagCounts: Record<string, number> = {};
    for (const v of videos) {
      for (const t of v.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }

    return {
      totalVideos: videos.length,
      totalPlayCount,
      totalStorageBytes,
      tagDistribution: tagCounts,
      analyticsData: this.data.analytics,
    };
  }

  // Last Import Directory Preference
  public getLastImportDirectory(): string | undefined {
    return this.data.lastImportDirectory;
  }

  public setLastImportDirectory(dir: string): void {
    if (dir && typeof dir === "string") {
      this.data.lastImportDirectory = dir;
      this.save();
    }
  }
}

export const db = new Database();
