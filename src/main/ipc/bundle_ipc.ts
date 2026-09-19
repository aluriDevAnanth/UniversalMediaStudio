import { ipcMain, dialog } from "electron";
import fs from "fs";
import path from "path";
import { BundleManager } from "../bundle_manager";
import { getBundlesDir } from "../paths";
import { db } from "../db";

export function registerBundleIpc(): void {
  ipcMain.handle("bundle:inspect", (_, bundlePath: string) => {
    try {
      let fullPath = bundlePath || "";
      if (!fullPath || !fs.existsSync(fullPath)) {
        const bundlesDir = getBundlesDir();
        fullPath = path.join(bundlesDir, path.basename(bundlePath || ""));
      }
      console.log("[IPC bundle:inspect]", fullPath);
      const res = BundleManager.readMetadata(fullPath);
      console.log(
        `[IPC bundle:inspect SUCCESS] Loaded ${Object.keys(res.metadata?.assets || {}).length} assets from bundle '${path.basename(fullPath)}'`,
      );
      return res;
    } catch (e: any) {
      console.error("[IPC bundle:inspect ERROR]", e);
      return { error: e.message };
    }
  });

  ipcMain.handle(
    "bundle:readAsset",
    (_, bundlePath: string, assetKey: string) => {
      try {
        let fullPath = bundlePath || "";
        if (!fullPath || !fs.existsSync(fullPath)) {
          const bundlesDir = getBundlesDir();
          fullPath = path.join(bundlesDir, path.basename(bundlePath || ""));
        }

        if (assetKey === "video") {
          console.log(
            `[IPC bundle:readAsset] Skipping RAM buffer read for video asset key (stream protocol active)`,
          );
          return { mimeType: "video/mp4", totalSize: 0, text: "", base64: "" };
        }

        console.log(
          `[IPC bundle:readAsset] '${assetKey}' from '${path.basename(fullPath)}'`,
        );
        const slice = BundleManager.readAssetSlice(fullPath, assetKey);
        console.log(
          `[IPC bundle:readAsset SUCCESS] '${assetKey}' (${slice.totalSize} bytes, mime: ${slice.mimeType})`,
        );
        return {
          mimeType: slice.mimeType,
          totalSize: slice.totalSize,
          text: slice.buffer.toString("utf-8"),
          base64: slice.buffer.toString("base64"),
        };
      } catch (e: any) {
        console.error("[IPC bundle:readAsset ERROR]", e);
        return { error: e.message };
      }
    },
  );

  ipcMain.handle(
    "bundle:addSubtitle",
    async (
      _,
      bundlePath: string,
      subtitleFilePath?: string,
      label?: string,
      lang?: string,
    ) => {
      try {
        let fullBundlePath = bundlePath || "";
        if (!fullBundlePath || !fs.existsSync(fullBundlePath)) {
          const bundlesDir = getBundlesDir();
          fullBundlePath = path.join(
            bundlesDir,
            path.basename(bundlePath || ""),
          );
        }

        let targetSubPath = subtitleFilePath;
        if (!targetSubPath) {
          const lastDir = db.getLastImportDirectory();
          const defaultPath = lastDir && fs.existsSync(lastDir) ? lastDir : undefined;

          const result = await dialog.showOpenDialog({
            title: "Select Subtitle File to Add into .adaumc Container",
            defaultPath,
            properties: ["openFile"],
            filters: [
              {
                name: "Subtitle Files (*.vtt, *.srt, *.ass, *.sub)",
                extensions: ["vtt", "srt", "ass", "sub", "txt"],
              },
            ],
          });
          if (result.canceled || result.filePaths.length === 0) {
            return null;
          }
          targetSubPath = result.filePaths[0];
          try {
            const chosenDir = path.dirname(targetSubPath);
            if (fs.existsSync(chosenDir)) {
              db.setLastImportDirectory(chosenDir);
            }
          } catch {}
        }

        console.log(
          `[IPC bundle:addSubtitle] Adding subtitle '${targetSubPath}' to '${path.basename(fullBundlePath)}'`,
        );
        const res = await BundleManager.addSubtitleTrack(
          fullBundlePath,
          targetSubPath,
          label,
          lang,
        );
        console.log(
          `[IPC bundle:addSubtitle SUCCESS] Added assetKey '${res.assetKey}' to bundle`,
        );
        return res;
      } catch (e: any) {
        console.error("[IPC bundle:addSubtitle ERROR]", e);
        return { error: e.message };
      }
    },
  );

  ipcMain.handle(
    "bundle:removeSubtitle",
    async (_, bundlePath: string, assetKey: string) => {
      try {
        let fullBundlePath = bundlePath || "";
        if (!fullBundlePath || !fs.existsSync(fullBundlePath)) {
          const bundlesDir = getBundlesDir();
          fullBundlePath = path.join(
            bundlesDir,
            path.basename(bundlePath || ""),
          );
        }

        console.log(
          `[IPC bundle:removeSubtitle] Removing '${assetKey}' from '${path.basename(fullBundlePath)}'`,
        );
        const res = await BundleManager.removeSubtitleTrack(
          fullBundlePath,
          assetKey,
        );
        console.log(
          `[IPC bundle:removeSubtitle SUCCESS] Removed assetKey '${assetKey}'`,
        );
        return res;
      } catch (e: any) {
        console.error("[IPC bundle:removeSubtitle ERROR]", e);
        return { error: e.message };
      }
    },
  );

  ipcMain.handle("bundle:optimize", async (_, bundlePath: string) => {
    try {
      const { BundleRepairManager } = require("../bundle_repair");
      let fullBundlePath = bundlePath || "";
      if (!fullBundlePath || !fs.existsSync(fullBundlePath)) {
        const bundlesDir = getBundlesDir();
        fullBundlePath = path.join(
          bundlesDir,
          path.basename(bundlePath || ""),
        );
      }
      return await BundleRepairManager.optimizeExistingBundle(fullBundlePath);
    } catch (e: any) {
      console.error("[IPC bundle:optimize ERROR]", e);
      return { success: false, error: e.message };
    }
  });
}
