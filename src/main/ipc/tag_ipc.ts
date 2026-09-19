import { ipcMain } from "electron";
import { db } from "../db";

export function registerTagIpc(): void {
  ipcMain.handle("tags:get", () => db.getTags());
  ipcMain.handle("tags:getMetadata", () => db.getTagMetadata());
  ipcMain.handle(
    "tags:setMetadata",
    (_, name: string, color: string, category?: string) =>
      db.setTagMetadata(name, color, category),
  );
  ipcMain.handle("tags:getCategoryColors", () => db.getCategoryColors());
  ipcMain.handle("tags:setCategoryColor", (_, category: string, color: string) =>
    db.setCategoryColor(category, color),
  );
  ipcMain.handle("tags:add", (_, tag: string, color?: string, category?: string) =>
    db.addTag(tag, color, category),
  );
  ipcMain.handle("tags:delete", (_, tag: string) => db.deleteTag(tag));
  ipcMain.handle("tags:rename", (_, oldTag: string, newTag: string) =>
    db.renameTag(oldTag, newTag),
  );
  ipcMain.handle("tags:updateVideo", (_, videoId: string, tags: string[]) =>
    db.updateVideoTags(videoId, tags),
  );
  ipcMain.handle(
    "tags:bulkUpdateVideos",
    (_, videoIds: string[], addTags: string[], removeTags: string[]) =>
      db.bulkUpdateVideoTags(videoIds, addTags, removeTags),
  );
}
