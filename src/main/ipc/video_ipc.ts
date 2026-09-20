import { ipcMain, dialog } from "electron";
import fs from "fs";
import path from "path";
import { db } from "../db";
import { importVideoFile, cancelActiveImport } from "../video/index";

export function registerVideoIpc(): void {
  ipcMain.handle("videos:getAll", () => db.getAllVideos());

  ipcMain.handle("videos:importFile", async (event) => {
    const lastDir = db.getLastImportDirectory();
    const defaultPath = lastDir && fs.existsSync(lastDir) ? lastDir : undefined;

    const result = await dialog.showOpenDialog({
      title: "Select Video or .adaumc Bundle File to Import",
      defaultPath,
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Media Files & ADAUMC Bundles",
          extensions: ["mp4", "mkv", "webm", "mov", "adaumc"],
        },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      console.log(`[Import Started] Selecting ${result.filePaths.length} files`);
      try {
        const chosenDir = path.dirname(result.filePaths[0]);
        if (fs.existsSync(chosenDir)) {
          db.setLastImportDirectory(chosenDir);
        }
      } catch {}

      const baseTime = Date.now();
      const promises = result.filePaths.map((selectedPath, index) => {
        const itemCreatedAt = new Date(baseTime + index * 10).toISOString();
        const taskId = `vid_${baseTime}_${index}_${Math.floor(Math.random() * 1000)}`;
        return importVideoFile(
          selectedPath,
          (progress) => {
            event.sender.send("video:importProgress", progress);
          },
          taskId,
          itemCreatedAt,
        );
      });

      Promise.all(promises)
        .then(() => {
          event.sender.send("catalog:refresh");
        })
        .catch((err) => {
          console.log(`[Import] Finished with notice: ${err.message}`);
          event.sender.send("catalog:refresh");
        });
      return true;
    }
    return null;
  });

  ipcMain.handle(
    "videos:importFilePath",
    async (event, filePath: string, taskId?: string, createdAt?: string) => {
      if (filePath) {
        console.log("[Import Path Started]", filePath, taskId);
        try {
          const chosenDir = path.dirname(filePath);
          if (fs.existsSync(chosenDir)) {
            db.setLastImportDirectory(chosenDir);
          }
        } catch {}
        return await importVideoFile(
          filePath,
          (progress) => {
            event.sender.send("video:importProgress", progress);
          },
          taskId,
          createdAt,
        );
      }
      return null;
    },
  );

  ipcMain.handle("videos:cancelImport", (_, taskId?: string) =>
    cancelActiveImport(taskId),
  );
  ipcMain.handle("videos:delete", (_, id: string) => db.deleteVideo(id));
  ipcMain.handle("videos:incrementPlay", (_, id: string) =>
    db.incrementPlayCount(id),
  );
}
