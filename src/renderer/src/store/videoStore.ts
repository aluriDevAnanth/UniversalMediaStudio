import { create } from "zustand";
import { VideoRecord, PlaylistRecord, AnalyticsData } from "../env";

export type SortOption =
  | "relevant"
  | "newest"
  | "oldest"
  | "title"
  | "duration"
  | "playCount";

interface VideoStoreState {
  isAuthenticated: boolean;
  isPasswordSet: boolean;
  videos: VideoRecord[];
  playlists: PlaylistRecord[];
  tags: string[];
  tagMetadata: Record<string, { color: string; category?: string }>;
  categoryColors: Record<string, string>;
  tagMatchMode: "ANY" | "ALL";
  selectedTags: string[];
  selectedPlaylistId: string | null;
  searchQuery: string;
  sortBy: SortOption;
  activeTab: "grid" | "playlists" | "storage" | "analytics";
  playingVideo: VideoRecord | null;
  isImporting: boolean;
  activeImports: Record<string, any>;
  analytics: AnalyticsData | null;
  theme: "dark" | "light";
  selectedVideoId: string | null;
  selectedVideoIds: string[];
  isShortcutsOpen: boolean;

  // Actions
  setShortcutsOpen: (open: boolean) => void;
  toggleShortcutsOpen: () => void;
  setSortBy: (sortBy: SortOption) => void;
  updateActiveImport: (progress: any) => void;
  removeActiveImport: (taskId: string) => void;
  cancelImport: (taskId?: string) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  login: (password: string) => Promise<boolean>;
  setupPassword: (password: string) => Promise<boolean>;
  lockApp: () => void;
  fetchData: () => Promise<void>;
  importVideoFile: () => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  togglePlaylistVideo: (playlistId: string, videoId: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTag: (tag: string, color?: string, category?: string) => Promise<void>;
  deleteTag: (tag: string) => Promise<void>;
  renameTag: (oldTag: string, newTag: string) => Promise<void>;
  setTagMetadata: (name: string, color: string, category?: string) => Promise<void>;
  setCategoryColor: (category: string, color: string) => Promise<void>;
  setTagMatchMode: (mode: "ANY" | "ALL") => void;
  updateVideoTags: (videoId: string, tags: string[]) => Promise<void>;
  toggleVideoSelection: (id: string) => void;
  selectAllVideos: (ids: string[]) => void;
  clearVideoSelection: () => void;
  bulkAddTag: (tag: string) => Promise<void>;
  bulkRemoveTag: (tag: string) => Promise<void>;
  bulkDeleteSelectedVideos: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleSelectedTag: (tag: string) => void;
  setSelectedTags: (tags: string[]) => void;
  clearSelectedTags: () => void;
  setSelectedPlaylistId: (id: string | null) => void;
  setSelectedVideoId: (id: string | null) => void;
  setActiveTab: (tab: "grid" | "playlists" | "storage" | "analytics") => void;
  setPlayingVideo: (video: VideoRecord | null) => void;
  toggleTheme: () => void;
}

export const useVideoStore = create<VideoStoreState>((set, get) => ({
  isAuthenticated: false,
  isPasswordSet: false,
  videos: [],
  playlists: [],
  tags: [],
  tagMetadata: {},
  categoryColors: {},
  tagMatchMode: "ANY",
  selectedTags: [],
  selectedPlaylistId: null,
  searchQuery: "",
  sortBy: "relevant",
  activeTab: "grid",
  playingVideo: null,
  isImporting: false,
  activeImports: {},
  analytics: null,
  theme: "dark",
  selectedVideoId: null,
  selectedVideoIds: [],
  isShortcutsOpen: false,

  setShortcutsOpen: (open: boolean) => set({ isShortcutsOpen: open }),
  toggleShortcutsOpen: () => set((state) => ({ isShortcutsOpen: !state.isShortcutsOpen })),
  setSortBy: (sortBy: SortOption) => set({ sortBy }),

  checkAuthStatus: async () => {
    try {
      const savedTheme =
        (localStorage.getItem("theme") as "dark" | "light") || "dark";
      set({ theme: savedTheme });
      document.documentElement.className = savedTheme;

      const isSet = await window.api.auth.isSet();
      set({ isPasswordSet: isSet });
      if (!isSet) {
        set({ isAuthenticated: false });
      }
    } catch (e) {
      console.error(e);
    }
  },

  login: async (password: string) => {
    const success = await window.api.auth.login(password);
    if (success) {
      set({ isAuthenticated: true });
      get().fetchData();
    }
    return success;
  },

  setupPassword: async (password: string) => {
    const success = await window.api.auth.setup(password);
    if (success) {
      set({ isPasswordSet: true, isAuthenticated: true });
      get().fetchData();
    }
    return success;
  },

  lockApp: () => {
    set({ isAuthenticated: false, playingVideo: null });
  },

  fetchData: async () => {
    try {
      const [videos, playlists, tags, tagMetadata, categoryColors, analytics] =
        await Promise.all([
          window.api.videos.getAll(),
          window.api.playlists.get(),
          window.api.tags.get(),
          window.api.tags.getMetadata(),
          window.api.tags.getCategoryColors
            ? window.api.tags.getCategoryColors()
            : Promise.resolve({}),
          window.api.analytics.get(),
        ]);
      set({
        videos,
        playlists,
        tags,
        tagMetadata: tagMetadata || {},
        categoryColors: categoryColors || {},
        analytics,
      });
    } catch (e) {
      console.error(e);
    }
  },

  setCategoryColor: async (category: string, color: string) => {
    if (window.api.tags.setCategoryColor) {
      const categoryColors = await window.api.tags.setCategoryColor(category, color);
      set({ categoryColors: categoryColors || {} });
    }
  },

  updateActiveImport: (progress: any) => {
    const nextImports = { ...get().activeImports, [progress.taskId]: progress };
    set({
      activeImports: nextImports,
      isImporting: Object.keys(nextImports).length > 0,
    });
  },

  removeActiveImport: (taskId: string) => {
    const nextImports = { ...get().activeImports };
    delete nextImports[taskId];
    set({
      activeImports: nextImports,
      isImporting: Object.keys(nextImports).length > 0,
    });
  },

  cancelImport: async (taskId?: string) => {
    await window.api.videos.cancelImport(taskId);
    if (taskId) {
      get().removeActiveImport(taskId);
    } else {
      set({ activeImports: {}, isImporting: false });
    }
  },

  importVideoFile: async () => {
    try {
      await window.api.videos.importFile();
    } catch (e) {
      console.error("Error importing video file:", e);
    }
  },

  deleteVideo: async (id: string) => {
    await window.api.videos.delete(id);
    await get().fetchData();
  },

  togglePlaylistVideo: async (playlistId: string, videoId: string) => {
    await window.api.playlists.toggleVideo(playlistId, videoId);
    await get().fetchData();
  },

  createPlaylist: async (name: string) => {
    await window.api.playlists.create(name);
    await get().fetchData();
  },

  deletePlaylist: async (id: string) => {
    await window.api.playlists.delete(id);
    await get().fetchData();
  },

  addTag: async (tag: string, color?: string, category?: string) => {
    const tags = await window.api.tags.add(tag, color, category);
    const tagMetadata = await window.api.tags.getMetadata();
    set({ tags, tagMetadata: tagMetadata || {} });
  },

  deleteTag: async (tag: string) => {
    const tags = await window.api.tags.delete(tag);
    const tagMetadata = await window.api.tags.getMetadata();
    set({ tags, tagMetadata: tagMetadata || {} });
    await get().fetchData();
  },

  renameTag: async (oldTag: string, newTag: string) => {
    const tags = await window.api.tags.rename(oldTag, newTag);
    const tagMetadata = await window.api.tags.getMetadata();
    set({ tags, tagMetadata: tagMetadata || {} });
    const currentSelected = get().selectedTags;
    if (currentSelected.includes(oldTag)) {
      const nextSelected = currentSelected.map((t) => (t === oldTag ? newTag : t));
      set({ selectedTags: Array.from(new Set(nextSelected)) });
    }
    await get().fetchData();
  },

  setTagMetadata: async (name: string, color: string, category?: string) => {
    const tagMetadata = await window.api.tags.setMetadata(name, color, category);
    set({ tagMetadata: tagMetadata || {} });
  },

  setTagMatchMode: (tagMatchMode: "ANY" | "ALL") => set({ tagMatchMode }),

  updateVideoTags: async (videoId: string, tags: string[]) => {
    await window.api.tags.updateVideo(videoId, tags);
    await get().fetchData();
  },

  toggleVideoSelection: (id: string) => {
    const current = get().selectedVideoIds;
    const next = current.includes(id)
      ? current.filter((vId) => vId !== id)
      : [...current, id];
    set({ selectedVideoIds: next });
  },

  selectAllVideos: (ids: string[]) => set({ selectedVideoIds: ids }),
  clearVideoSelection: () => set({ selectedVideoIds: [] }),

  bulkAddTag: async (tag: string) => {
    const selectedIds = get().selectedVideoIds;
    if (selectedIds.length === 0) return;
    await window.api.tags.bulkUpdateVideos(selectedIds, [tag], []);
    await get().fetchData();
  },

  bulkRemoveTag: async (tag: string) => {
    const selectedIds = get().selectedVideoIds;
    if (selectedIds.length === 0) return;
    await window.api.tags.bulkUpdateVideos(selectedIds, [], [tag]);
    await get().fetchData();
  },

  bulkDeleteSelectedVideos: async () => {
    const selectedIds = get().selectedVideoIds;
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await window.api.videos.delete(id);
    }
    set({ selectedVideoIds: [] });
    await get().fetchData();
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  toggleSelectedTag: (tag: string) => {
    const current = get().selectedTags;
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    set({ selectedTags: next });
  },
  setSelectedTags: (tags: string[]) => set({ selectedTags: tags }),
  clearSelectedTags: () => set({ selectedTags: [] }),
  setSelectedPlaylistId: (selectedPlaylistId: string | null) =>
    set({ selectedPlaylistId }),
  setSelectedVideoId: (selectedVideoId: string | null) =>
    set({ selectedVideoId }),
  setActiveTab: (activeTab: "grid" | "playlists" | "storage" | "analytics") =>
    set({ activeTab }),
  setPlayingVideo: (playingVideo: VideoRecord | null) => {
    set({ playingVideo });
    if (playingVideo) {
      window.api.videos.incrementPlay(playingVideo.id);
    }
  },
  toggleTheme: () => {
    const nextTheme = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", nextTheme);
    document.documentElement.className = nextTheme;
    set({ theme: nextTheme });
  },
}));
