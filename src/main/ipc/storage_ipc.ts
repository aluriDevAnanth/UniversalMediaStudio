import { ipcMain } from "electron";
import { storageCleaner } from "../storage_cleaner";

export function registerStorageIpc(): void {
  ipcMain.handle("storage:cleanOrphans", async () => {
    return await storageCleaner.cleanOrphansNow();
  });
}
