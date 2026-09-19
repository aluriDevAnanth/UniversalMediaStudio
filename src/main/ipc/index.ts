import { registerAuthIpc } from "./auth_ipc";
import { registerVideoIpc } from "./video_ipc";
import { registerPlaylistIpc } from "./playlist_ipc";
import { registerTagIpc } from "./tag_ipc";
import { registerAnalyticsIpc } from "./analytics_ipc";
import { registerBundleIpc } from "./bundle_ipc";
import { registerStorageIpc } from "./storage_ipc";

export function registerAllIpcHandlers(): void {
  registerAuthIpc();
  registerVideoIpc();
  registerPlaylistIpc();
  registerTagIpc();
  registerAnalyticsIpc();
  registerBundleIpc();
  registerStorageIpc();
}

export {
  registerAuthIpc,
  registerVideoIpc,
  registerPlaylistIpc,
  registerTagIpc,
  registerAnalyticsIpc,
  registerBundleIpc,
  registerStorageIpc,
};
