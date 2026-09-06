import { ipcMain } from "electron";
import { db } from "./db";
import { RecommendationEngine } from "../recommendation/engine";
import { UserContext, Video } from "../recommendation/types";

function dbVideoToRecommendationVideo(dbVideo: any): Video {
  return {
    id: dbVideo.id,
    title: dbVideo.title,
    tags: dbVideo.tags || [],
    playCount: dbVideo.playCount || 0,
    lastWatchedAt: dbVideo.lastWatchedAt ? new Date(dbVideo.lastWatchedAt) : undefined,
    duration: dbVideo.duration,
    bundlePath: dbVideo.bundlePath,
    resolution: dbVideo.resolution,
    uploadDate: dbVideo.createdAt ? new Date(dbVideo.createdAt) : undefined,
  };
}

function buildUserContext(state: Partial<UserContext> = {}): UserContext {
  const allDbVideos = db.getAllVideos();
  const allPlaylists = db.getPlaylists();

  const playlistsMap: Record<string, string[]> = {};
  allPlaylists.forEach((pl) => {
    playlistsMap[pl.id] = pl.videoIds || [];
  });

  return {
    allVideos: allDbVideos.map(dbVideoToRecommendationVideo),
    playlists: playlistsMap,
    searchQuery: state.searchQuery || "",
    selectedTags: state.selectedTags || [],
    sessionStartTime: new Date(),
    currentVideoId: state.currentVideoId,
    watchHistory: [],
  };
}

export function registerRecommendationApi(): void {
  // Get personalized recommendations
  ipcMain.handle(
    "recommendations:get",
    async (_, params?: { videoId?: string; limit?: number; context?: Partial<UserContext> }) => {
      try {
        const userContext = buildUserContext(params?.context);
        const engine = new RecommendationEngine(userContext);
        const recommendations = engine.getRecommendations(
          params?.videoId,
          params?.limit || 20,
        );
        return { success: true, recommendations };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  // Get trending videos
  ipcMain.handle(
    "recommendations:trending",
    async (_, params?: { limit?: number; context?: Partial<UserContext> }) => {
      try {
        const userContext = buildUserContext(params?.context);
        const engine = new RecommendationEngine(userContext);
        const trending = engine.getTrendingVideos(params?.limit || 10);
        return { success: true, recommendations: trending };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  // Get "Because you watched" recommendations
  ipcMain.handle(
    "recommendations:becauseYouWatched",
    async (_, params: { videoId: string; limit?: number; context?: Partial<UserContext> }) => {
      try {
        const userContext = buildUserContext(params?.context);
        const engine = new RecommendationEngine(userContext);
        const recommendations = engine.getBecauseYouWatched(
          params.videoId,
          params.limit || 10,
        );
        return { success: true, recommendations };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  // Get recommendations by tags
  ipcMain.handle(
    "recommendations:byTags",
    async (_, params: { tags: string[]; limit?: number }) => {
      try {
        const userContext = buildUserContext({ selectedTags: params.tags });
        const engine = new RecommendationEngine(userContext);
        const recommendations = engine.getRecommendations(undefined, params.limit || 20);
        return { success: true, recommendations };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );
}
