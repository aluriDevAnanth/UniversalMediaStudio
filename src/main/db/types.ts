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
  fileSize?: number;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  isDefault: boolean;
  videoIds: string[];
  createdAt: string;
}

export interface AnalyticsRecord {
  totalWatchTimeSeconds: number;
  totalVideosProcessed: number;
  lastProcessingSpeedSeconds: number;
}

export interface TagMetaItem {
  color: string;
  category?: string;
}

export interface DBData {
  masterPasswordHash: string | null;
  videos: Record<string, VideoRecord>;
  playlists: Record<string, PlaylistRecord>;
  tags: string[];
  tagMetadata?: Record<string, TagMetaItem>;
  categoryColors?: Record<string, string>;
  analytics: AnalyticsRecord;
  lastImportDirectory?: string;
}
