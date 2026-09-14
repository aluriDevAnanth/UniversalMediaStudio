import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { getDatabasePath, getLegacyDatabasePath } from "./paths";
import { EncryptedSQLiteEngine } from "./encrypted_sqlite";
import {
  VideoRecord,
  PlaylistRecord,
  AnalyticsRecord,
  TagMetaItem,
  DBData,
  VideoRepository,
  PlaylistRepository,
  TagRepository,
  AnalyticsRepository,
  DBSyncManager,
} from "./db/index";

export type { VideoRecord, PlaylistRecord, AnalyticsRecord, TagMetaItem, DBData };

export class Database {
  private dbPath: string;
  private sqliteEngine: EncryptedSQLiteEngine;
  private data: DBData;
  private activeMasterPassword: string | null = null;
  private isCustomPath = false;

  private videoRepo: VideoRepository;
  private playlistRepo: PlaylistRepository;
  private tagRepo: TagRepository;
  private analyticsRepo: AnalyticsRepository;
  private syncManager: DBSyncManager;

  constructor(customDbPath?: string) {
    this.isCustomPath = !!customDbPath;
    this.dbPath = customDbPath || getDatabasePath();
    const sqlitePath = this.dbPath.endsWith(".enc") ? this.dbPath : `${this.dbPath}.enc`;
    this.sqliteEngine = new EncryptedSQLiteEngine(sqlitePath);
    this.data = this.loadLegacyOrDefaults();

    this.videoRepo = new VideoRepository(this.data, this.sqliteEngine, () => this.save());
    this.playlistRepo = new PlaylistRepository(this.data, this.sqliteEngine, () => this.save());
    this.tagRepo = new TagRepository(this.data, () => this.save());
    this.analyticsRepo = new AnalyticsRepository(this.data);
    this.syncManager = new DBSyncManager(this.data, this.sqliteEngine, () => this.initDefaults());

    this.initDefaults();
    this.cleanGenericTags();

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

    if (!this.isCustomPath) {
      const appDataFallback = path.join(
        require("os").homedir(),
        "AppData",
        "Roaming",
        "UniversalMediaStudio",
        "mediahub_store.json",
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
    if (this.sqliteEngine.isUnlocked()) {
      try {
        this.syncToEncryptedSqlite();
      } catch (err) {
        console.error("Error syncing to encrypted SQLite DB:", err);
      }
    }

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

  public syncToEncryptedSqlite(): void {
    this.syncManager.syncToEncryptedSqlite();
  }

  public loadFromEncryptedSqlite(): void {
    this.syncManager.loadFromEncryptedSqlite();
  }

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
    if (this.sqliteEngine.exists()) {
      try {
        const unlocked = await this.sqliteEngine.unlockWithPassword(password);
        if (unlocked) {
          this.activeMasterPassword = password;
          this.loadFromEncryptedSqlite();

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

  // Videos Delegation
  public getAllVideos(): VideoRecord[] {
    return this.videoRepo.getAllVideos();
  }

  public getVideo(id: string): VideoRecord | undefined {
    return this.videoRepo.getVideo(id);
  }

  public saveVideo(video: VideoRecord): void {
    this.videoRepo.saveVideo(video);
  }

  public deleteVideo(id: string): boolean {
    return this.videoRepo.deleteVideo(id);
  }

  public incrementPlayCount(id: string): void {
    this.videoRepo.incrementPlayCount(id);
  }

  public updateVideoTags(videoId: string, tags: string[]): VideoRecord {
    return this.videoRepo.updateVideoTags(videoId, tags);
  }

  public bulkUpdateVideoTags(
    videoIds: string[],
    addTags: string[],
    removeTags: string[],
  ): VideoRecord[] {
    return this.videoRepo.bulkUpdateVideoTags(videoIds, addTags, removeTags);
  }

  // Playlists Delegation
  public getPlaylists(): PlaylistRecord[] {
    return this.playlistRepo.getPlaylists();
  }

  public createPlaylist(name: string): PlaylistRecord {
    return this.playlistRepo.createPlaylist(name);
  }

  public toggleVideoInPlaylist(playlistId: string, videoId: string): PlaylistRecord {
    return this.playlistRepo.toggleVideoInPlaylist(playlistId, videoId);
  }

  public deletePlaylist(playlistId: string): boolean {
    return this.playlistRepo.deletePlaylist(playlistId);
  }

  // Tags Delegation
  public getTags(): string[] {
    return this.tagRepo.getTags();
  }

  public getCategoryColors(): Record<string, string> {
    return this.tagRepo.getCategoryColors();
  }

  public setCategoryColor(category: string, color: string): Record<string, string> {
    return this.tagRepo.setCategoryColor(category, color);
  }

  public getTagMetadata(): Record<string, TagMetaItem> {
    return this.tagRepo.getTagMetadata();
  }

  public setTagMetadata(name: string, color: string, category?: string): Record<string, TagMetaItem> {
    return this.tagRepo.setTagMetadata(name, color, category);
  }

  public addTag(tag: string, color?: string, category?: string): string[] {
    return this.tagRepo.addTag(tag, color, category);
  }

  public deleteTag(tag: string): string[] {
    return this.tagRepo.deleteTag(tag);
  }

  public renameTag(oldTag: string, newTag: string): string[] {
    return this.tagRepo.renameTag(oldTag, newTag);
  }

  // Analytics Delegation
  public getAnalytics() {
    return this.analyticsRepo.getAnalytics();
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
