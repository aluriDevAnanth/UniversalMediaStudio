import { app, BrowserWindow, protocol } from "electron";
import { getPortableDataDir } from "./paths";

// Configure 100% self-contained portable userData directory
try {
  app.setPath("userData", getPortableDataDir());
} catch {}

import { registerAdaumcProtocol } from "./protocol";
import { registerRecommendationApi } from "./recommendationApi";
import { db } from "./db";
import { storageCleaner } from "./storage_cleaner";
import { registerAllIpcHandlers } from "./ipc/index";
import { createMainWindow } from "./window";

// Stable Chromium GPU Switches
app.commandLine.appendSwitch("enable-features", "HardwareMediaKeyHandling,MediaFoundationRender");
app.commandLine.appendSwitch("disable-features", "UseModernMediaControls,CdmStorageDatabase");

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

app.whenReady().then(async () => {
  // Initialize and unlock encrypted SQLite database container
  await db.initialize();

  // Register adaumc:// custom protocol handler
  registerAdaumcProtocol();
  // Register recommendation API
  registerRecommendationApi();

  // Register modular IPC Handlers
  registerAllIpcHandlers();

  // Start periodic background orphan storage cleaner (runs non-blocking every 60s)
  storageCleaner.start(60_000);

  createMainWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("before-quit", () => {
  storageCleaner.stop();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
