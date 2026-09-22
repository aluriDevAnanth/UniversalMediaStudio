import { ipcMain } from "electron";
import { db } from "../db";

export function registerAnalyticsIpc(): void {
  ipcMain.handle("analytics:get", () => db.getAnalytics());
}
