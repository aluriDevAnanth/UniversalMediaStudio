import fs from "fs";
import { VideoRecord, DBData } from "./types";
import { EncryptedSQLiteEngine } from "../encrypted_sqlite";

export class VideoRepository {
  constructor(
    private data: DBData,
    private sqliteEngine: EncryptedSQLiteEngine,
    private onSave: () => void,
  ) {}

  public getAllVideos(): VideoRecord[] {
    return Object.values(this.data.videos);
  }

  public getVideo(id: string): VideoRecord | undefined {
    return this.data.videos[id];
  }

  public saveVideo(video: VideoRecord): void {
    this.data.videos[video.id] = video;
    this.data.analytics.totalVideosProcessed += 1;
    this.onSave();
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

      this.onSave();
      return true;
    }
    return false;
  }

  public incrementPlayCount(id: string): void {
    const v = this.data.videos[id];
    if (v) {
      v.playCount = (v.playCount || 0) + 1;
      v.lastWatchedAt = new Date().toISOString();
      this.onSave();
    }
  }

  public updateVideoTags(videoId: string, tags: string[]): VideoRecord {
    const v = this.data.videos[videoId];
    if (v) {
      v.tags = tags;
      this.onSave();
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
        const set = new Set(v.tags);
        addTags.forEach((t) => set.add(t));
        removeTags.forEach((t) => set.delete(t));
        v.tags = Array.from(set);
        updated.push(v);
      }
    }
    this.onSave();
    return updated;
  }
}
