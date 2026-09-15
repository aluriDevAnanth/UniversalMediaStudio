import { PlaylistRecord, DBData } from "./types";
import { EncryptedSQLiteEngine } from "../encrypted_sqlite";

export class PlaylistRepository {
  constructor(
    private data: DBData,
    private sqliteEngine: EncryptedSQLiteEngine,
    private onSave: () => void,
  ) {}

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
    this.onSave();
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
      this.onSave();
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
      this.onSave();
      return true;
    }
    return false;
  }
}
