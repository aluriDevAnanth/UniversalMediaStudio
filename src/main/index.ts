import { app, BrowserWindow, ipcMain, shell, dialog, protocol } from "electron";
import fs from "fs";
import path from "path";
import { registerAdaumcProtocol } from "./protocol";
import { db } from "./db";
import { importVideoFile, cancelActiveImport } from "./random_video";
import { BundleManager } from "./bundle_manager";

// Hardware Video Acceleration & GPU Rasterization Switches
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-hardware-overlays");

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// Register adaumc protocol privileges for video streaming, CORS & Range requests
protocol.registerSchemesAsPrivileged([
  {
    scheme: "adaumc",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      codeCache: true,
      bypassCSP: true,
    },
  },
]);

function createWindow(): void {
  const iconPath = path.join(__dirname, "../../resources/icon.png");

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    show: false,
    frame: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      webSecurity: false, // Allows custom protocol adaumc:// loading
    },
  });

  ipcMain.on("window:minimize", () => mainWindow.minimize());
  ipcMain.on("window:maximize", () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on("window:close", () => mainWindow.close());

  mainWindow.on("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  // Register adaumc:// custom protocol handler
  registerAdaumcProtocol();

  // Setup IPC Handlers
  ipcMain.handle("auth:isSet", () => db.isPasswordSet());
  ipcMain.handle("auth:setup", (_, password: string) =>
    db.setMasterPassword(password),
  );
  ipcMain.handle("auth:login", (_, password: string) =>
    db.verifyMasterPassword(password),
  );

  ipcMain.handle("videos:getAll", () => db.getAllVideos());

  ipcMain.handle("videos:importFile", async (event) => {
    const result = await dialog.showOpenDialog({
      title: "Select Video or .adaumc Bundle File to Import",
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
      const promises = result.filePaths.map((selectedPath) => {
        return importVideoFile(selectedPath, (progress) => {
          event.sender.send("video:importProgress", progress);
          event.sender.send("progress:update", progress);
        });
      });
      // Run concurrently
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

  ipcMain.handle("videos:importFilePath", async (event, filePath: string, taskId?: string) => {
    if (filePath) {
      console.log("[Import Path Started]", filePath, taskId);
      return await importVideoFile(filePath, (progress) => {
        event.sender.send("video:importProgress", progress);
        event.sender.send("progress:update", progress);
      }, taskId);
    }
    return null;
  });

  ipcMain.handle("videos:cancelImport", (_, taskId?: string) => cancelActiveImport(taskId));
  ipcMain.handle("videos:delete", (_, id: string) => db.deleteVideo(id));
  ipcMain.handle("videos:incrementPlay", (_, id: string) =>
    db.incrementPlayCount(id),
  );

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

  ipcMain.handle("analytics:get", () => db.getAnalytics());

  ipcMain.handle("bundle:inspect", (_, bundlePath: string) => {
    try {
      let fullPath = bundlePath || "";
      if (!fullPath || !fs.existsSync(fullPath)) {
        const bundlesDir = path.join(app.getPath("userData"), "bundles");
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
          const bundlesDir = path.join(app.getPath("userData"), "bundles");
          fullPath = path.join(bundlesDir, path.basename(bundlePath || ""));
        }

        // Prevent reading massive video assets into V8 Buffer memory
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
          const bundlesDir = path.join(app.getPath("userData"), "bundles");
          fullBundlePath = path.join(
            bundlesDir,
            path.basename(bundlePath || ""),
          );
        }

        let targetSubPath = subtitleFilePath;
        if (!targetSubPath) {
          const result = await dialog.showOpenDialog({
            title: "Select Subtitle File to Add into .adaumc Container",
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
          const bundlesDir = path.join(app.getPath("userData"), "bundles");
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
      const { BundleRepairManager } = require("./bundle_repair");
      let fullBundlePath = bundlePath || "";
      if (!fullBundlePath || !fs.existsSync(fullBundlePath)) {
        const bundlesDir = path.join(app.getPath("userData"), "bundles");
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

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
