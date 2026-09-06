export interface Video {
  id: string;
  title: string;
  tags: string[]; // Format: "Category:Name" or "Tag"
  playCount: number;
  lastWatchedAt?: Date | string;
  duration?: number;
  uploadDate?: Date | string;
  views?: number;
  likes?: number;
  categories?: string[];
  bundlePath?: string;
  resolution?: string;
}

export interface WatchHistoryEntry {
  videoId: string;
  timestamp: Date | string;
  watchDuration: number; // seconds
  completed: boolean;
  seekCount: number;
}

export interface UserContext {
  searchQuery: string;
  selectedTags: string[];
  playlists: {
    favourite?: string[];
    watch_later?: string[];
    [key: string]: string[] | undefined;
  };
  allVideos: Video[];
  watchHistory?: WatchHistoryEntry[];
  sessionStartTime?: Date;
  currentVideoId?: string;
}

export interface RecommendationResult {
  video: Video;
  score: number;
  reasons: string[];
  source: "content" | "collaborative" | "context" | "trending" | "blended";
}
