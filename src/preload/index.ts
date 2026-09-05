import { contextBridge, ipcRenderer } from "electron";

const api = {
  auth: {
    isSet: () => ipcRenderer.invoke("auth:isSet"),
    setup: (password: string) => ipcRenderer.invoke("auth:setup", password),
    login: (password: string) => ipcRenderer.invoke("auth:login", password),
  },
  videos: {
    getAll: () => ipcRenderer.invoke("videos:getAll"),
    importFile: () => ipcRenderer.invoke("videos:importFile"),
    importFilePath: (filePath: string, taskId?: string) =>
      ipcRenderer.invoke("videos:importFilePath", filePath, taskId),
    cancelImport: (taskId?: string) => ipcRenderer.invoke("videos:cancelImport", taskId),
    delete: (id: string) => ipcRenderer.invoke("videos:delete", id),
    incrementPlay: (id: string) =>
      ipcRenderer.invoke("videos:incrementPlay", id),
    onProgressUpdate: (
      callback: (data: {
        taskId: string;
        fileName: string;
        step: number;
        totalSteps: number;
        percent: number;
        workDone?: number;
        totalWork?: number;
        log: string;
        etaSeconds: number | null;
      }) => void,
    ) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on("video:importProgress", handler);
      ipcRenderer.on("progress:update", handler);
      return () => {
        ipcRenderer.removeListener("video:importProgress", handler);
        ipcRenderer.removeListener("progress:update", handler);
      };
    },
  },
  playlists: {
    get: () => ipcRenderer.invoke("playlists:get"),
    create: (name: string) => ipcRenderer.invoke("playlists:create", name),
    toggleVideo: (playlistId: string, videoId: string) =>
      ipcRenderer.invoke("playlists:toggleVideo", playlistId, videoId),
    delete: (playlistId: string) =>
      ipcRenderer.invoke("playlists:delete", playlistId),
  },
  tags: {
    get: () => ipcRenderer.invoke("tags:get"),
    getMetadata: () => ipcRenderer.invoke("tags:getMetadata"),
    setMetadata: (name: string, color: string, category?: string) =>
      ipcRenderer.invoke("tags:setMetadata", name, color, category),
    getCategoryColors: () => ipcRenderer.invoke("tags:getCategoryColors"),
    setCategoryColor: (category: string, color: string) =>
      ipcRenderer.invoke("tags:setCategoryColor", category, color),
    add: (tag: string, color?: string, category?: string) =>
      ipcRenderer.invoke("tags:add", tag, color, category),
    delete: (tag: string) => ipcRenderer.invoke("tags:delete", tag),
    rename: (oldTag: string, newTag: string) =>
      ipcRenderer.invoke("tags:rename", oldTag, newTag),
    updateVideo: (videoId: string, tags: string[]) =>
      ipcRenderer.invoke("tags:updateVideo", videoId, tags),
    bulkUpdateVideos: (
      videoIds: string[],
      addTags: string[],
      removeTags: string[],
    ) =>
      ipcRenderer.invoke(
        "tags:bulkUpdateVideos",
        videoIds,
        addTags,
        removeTags,
      ),
  },
  analytics: {
    get: () => ipcRenderer.invoke("analytics:get"),
  },
  bundle: {
    inspect: (bundlePath: string) =>
      ipcRenderer.invoke("bundle:inspect", bundlePath),
    readAsset: (bundlePath: string, assetKey: string) =>
      ipcRenderer.invoke("bundle:readAsset", bundlePath, assetKey),
    addSubtitle: (
      bundlePath: string,
      subtitleFilePath?: string,
      label?: string,
      lang?: string,
    ) =>
      ipcRenderer.invoke(
        "bundle:addSubtitle",
        bundlePath,
        subtitleFilePath,
        label,
        lang,
      ),
    removeSubtitle: (bundlePath: string, assetKey: string) =>
      ipcRenderer.invoke("bundle:removeSubtitle", bundlePath, assetKey),
    optimize: (bundlePath: string) =>
      ipcRenderer.invoke("bundle:optimize", bundlePath),
  },
  windowControls: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore
  window.api = api;
}
