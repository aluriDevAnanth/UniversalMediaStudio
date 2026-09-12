import { describe, it, expect, beforeAll, beforeEach } from "bun:test";
import { useVideoStore } from "../src/renderer/src/store/videoStore";

describe("Extended Zustand Video Store Actions & State (src/renderer/src/store/videoStore.ts)", () => {
  beforeAll(() => {
    // Mock browser globals
    if (typeof globalThis.localStorage === "undefined") {
      const storage: Record<string, string> = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => storage[k] || null,
        setItem: (k: string, v: string) => {
          storage[k] = v;
        },
        removeItem: (k: string) => {
          delete storage[k];
        },
      };
    }

    if (typeof globalThis.document === "undefined") {
      (globalThis as any).document = {
        documentElement: {
          className: "dark",
        },
      };
    }

    if (typeof globalThis.window === "undefined") {
      (globalThis as any).window = {
        api: {
          videos: {
            incrementPlay: () => Promise.resolve(),
          },
        },
      };
    } else if (!window.api) {
      (globalThis as any).window.api = {
        videos: {
          incrementPlay: () => Promise.resolve(),
        },
      };
    }
  });

  beforeEach(() => {
    // Reset store state
    useVideoStore.setState({
      isAuthenticated: true,
      isPasswordSet: true,
      videos: [],
      playlists: [],
      tags: [],
      selectedTags: [],
      selectedPlaylistId: null,
      searchQuery: "",
      sortBy: "relevant",
      activeTab: "grid",
      playingVideo: null,
      theme: "dark",
      selectedVideoId: null,
      selectedVideoIds: [],
      activeImports: {},
      isShortcutsOpen: false,
    });
  });

  it("should switch active tabs correctly", () => {
    const store = useVideoStore.getState();
    expect(store.activeTab).toBe("grid");

    store.setActiveTab("playlists");
    expect(useVideoStore.getState().activeTab).toBe("playlists");

    store.setActiveTab("storage");
    expect(useVideoStore.getState().activeTab).toBe("storage");

    store.setActiveTab("analytics");
    expect(useVideoStore.getState().activeTab).toBe("analytics");
  });

  it("should update search queries and manage selected tags", () => {
    const store = useVideoStore.getState();

    store.setSearchQuery("Cyberpunk Odyssey");
    expect(useVideoStore.getState().searchQuery).toBe("Cyberpunk Odyssey");

    store.setSelectedTags(["Genre:Sci-Fi", "Director:Nolan"]);
    expect(useVideoStore.getState().selectedTags).toEqual(["Genre:Sci-Fi", "Director:Nolan"]);

    store.clearSelectedTags();
    expect(useVideoStore.getState().selectedTags).toEqual([]);
  });

  it("should toggle theme between dark and light", () => {
    const store = useVideoStore.getState();
    expect(store.theme).toBe("dark");

    store.toggleTheme();
    expect(useVideoStore.getState().theme).toBe("light");
    expect((globalThis as any).document.documentElement.className).toBe("light");

    store.toggleTheme();
    expect(useVideoStore.getState().theme).toBe("dark");
    expect((globalThis as any).document.documentElement.className).toBe("dark");
  });

  it("should handle playing video state and lockApp authentication reset", () => {
    const store = useVideoStore.getState();
    const fakeVideo = {
      id: "vid_play_01",
      title: "Active Video",
      duration: 100,
      resolution: "1080p",
      tags: [],
      bundlePath: "/bundles/vid_play_01.adaumc",
      createdAt: new Date().toISOString(),
    };

    store.setPlayingVideo(fakeVideo);
    expect(useVideoStore.getState().playingVideo?.id).toBe("vid_play_01");

    store.lockApp();
    const lockedState = useVideoStore.getState();
    expect(lockedState.isAuthenticated).toBe(false);
    expect(lockedState.selectedVideoId).toBeNull();
    expect(lockedState.selectedVideoIds).toEqual([]);
  });

  it("should track active imports progress updates and removal", () => {
    const store = useVideoStore.getState();

    store.updateActiveImport({
      taskId: "import_task_01",
      fileName: "MyMovie",
      step: 2,
      percent: 45,
    });

    expect(useVideoStore.getState().activeImports["import_task_01"]).toBeDefined();
    expect(useVideoStore.getState().activeImports["import_task_01"].percent).toBe(45);

    store.removeActiveImport("import_task_01");
    expect(useVideoStore.getState().activeImports["import_task_01"]).toBeUndefined();
  });
});
