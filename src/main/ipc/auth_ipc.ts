import { ipcMain } from "electron";
import { db } from "../db";

export function registerAuthIpc(): void {
  ipcMain.handle("auth:isSet", () => db.isPasswordSet());
  ipcMain.handle("auth:setup", (_, password: string) =>
    db.setMasterPassword(password),
  );
  ipcMain.handle("auth:login", (_, password: string) =>
    db.verifyMasterPassword(password),
  );
}
