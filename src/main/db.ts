import fs from "fs";
import path from "path";
import os from "os";
import bcrypt from "bcryptjs";

let electronApp: any = null;
try {
  const electron = require("electron");
  electronApp = electron?.app || electron?.default?.app || null;
} catch {}

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
}

export class Database {
  private dbPath: string;
  private data: DBData;

  constructor(customDbPath?: string) {
    if (customDbPath) {
      this.dbPath = customDbPath;
    } else {
      let userDataPath = path.join(os.tmpdir(), "UniversalMediaStudio");
      try {
        if (electronApp && typeof electronApp.getPath === "function") {
          userDataPath = electronApp.getPath("userData");
        }
      } catch {}
      this.dbPath = path.join(userDataPath, "mediahub_store.json");
    }
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    this.data = this.load();
    this.initDefaults();
    this.cleanGenericTags();
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

  private load(): DBData {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, "utf-8");
        return JSON.parse(raw);
      } catch (err) {
        console.error("Failed to parse DB file, resetting defaults", err);
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
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), "utf-8");
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

  // Master Auth methods
  public isPasswordSet(): boolean {
    return !!this.data.masterPasswordHash;
  }

  public setMasterPassword(password: string): boolean {
    const salt = bcrypt.genSaltSync(10);
    this.data.masterPasswordHash = bcrypt.hashSync(password, salt);
    this.save();
    return true;
  }

  public verifyMasterPassword(password: string): boolean {
    if (!this.data.masterPasswordHash) return false;
    return bcrypt.compareSync(password, this.data.masterPasswordHash);
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
      v.tags = v.tags.filter((t) => t !== tag);
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
}

export const db = new Database();
