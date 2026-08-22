export interface VideoRecord {
  id: string;
  title: string;
  duration: number;
  resolution: string;
  tags: string[];
  bundlePath: string;
  createdAt: string;
  playCount: number;
  lastWatchedAt?: string;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  isDefault: boolean;
  videoIds: string[];
  createdAt: string;
}

export interface AnalyticsData {
  totalVideos: number;
  totalPlayCount: number;
  totalStorageBytes: number;
  tagDistribution: Record<string, number>;
  analyticsData: {
    totalWatchTimeSeconds: number;
    totalVideosProcessed: number;
    lastProcessingSpeedSeconds: number;
  };
}

export interface IElectronAPI {
  auth: {
    isSet: () => Promise<boolean>;
    setup: (password: string) => Promise<boolean>;
    login: (password: string) => Promise<boolean>;
  };
  videos: {
    getAll: () => Promise<VideoRecord[]>;
    importFile: () => Promise<VideoRecord | null>;
    importFilePath: (filePath: string, taskId?: string) => Promise<VideoRecord | null>;
    cancelImport: (taskId?: string) => Promise<boolean>;
    delete: (id: string) => Promise<boolean>;
    incrementPlay: (id: string) => Promise<void>;
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
    ) => () => void;
  };
  playlists: {
    get: () => Promise<PlaylistRecord[]>;
    create: (name: string) => Promise<PlaylistRecord>;
    toggleVideo: (
      playlistId: string,
      videoId: string,
    ) => Promise<PlaylistRecord>;
    delete: (playlistId: string) => Promise<boolean>;
  };
  tags: {
    get: () => Promise<string[]>;
    add: (tag: string) => Promise<string[]>;
    delete: (tag: string) => Promise<string[]>;
    rename: (oldTag: string, newTag: string) => Promise<string[]>;
    updateVideo: (videoId: string, tags: string[]) => Promise<VideoRecord>;
  };
  analytics: {
    get: () => Promise<AnalyticsData>;
  };
  bundle: {
    inspect: (
      bundlePath: string,
    ) => Promise<{
      metadata: AdaumcMetadata;
      payloadStartOffset: number;
      error?: string;
    }>;
    readAsset: (
      bundlePath: string,
      assetKey: string,
    ) => Promise<{
      mimeType: string;
      totalSize: number;
      text: string;
      base64: string;
      error?: string;
    }>;
    addSubtitle: (
      bundlePath: string,
      subtitleFilePath?: string,
      label?: string,
      lang?: string,
    ) => Promise<{ assetKey: string; metadata: AdaumcMetadata } | { error: string } | null>;
    removeSubtitle: (
      bundlePath: string,
      assetKey: string,
    ) => Promise<{ assetKey: string; metadata: AdaumcMetadata } | { error: string }>;
  };
  windowControls: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
