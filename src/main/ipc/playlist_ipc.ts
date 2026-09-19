import { ipcMain } from "electron";
import { db } from "../db";

export function registerPlaylistIpc(): void {
  ipcMain.handle("playlists:get", () => db.getPlaylists());
  ipcMain.handle("playlists:create", (_, name: string) =>
    db.createPlaylist(name),
  );
  ipcMain.handle(
    "playlists:toggleVideo",
    (_, playlistId: string, videoId: string) =>
      db.toggleVideoInPlaylist(playlistId, videoId),
  );
  ipcMain.handle("playlists:delete", (_, playlistId: string) =>
    db.deletePlaylist(playlistId),
  );
}
