import { describe, it, expect } from "bun:test";
import { useVideoStore } from "../src/renderer/src/store/videoStore";

describe("Zustand VideoStore State Management", () => {
  it("should initialize with default sort mode set to relevant", () => {
    const state = useVideoStore.getState();
    expect(state.sortBy).toBe("relevant");
    expect(state.tagMatchMode).toBe("ANY");
    expect(state.activeTab).toBe("grid");
    expect(state.selectedVideoIds).toEqual([]);
  });

  it("should update sort options correctly", () => {
    const { setSortBy } = useVideoStore.getState();

    setSortBy("newest");
    expect(useVideoStore.getState().sortBy).toBe("newest");

    setSortBy("playCount");
    expect(useVideoStore.getState().sortBy).toBe("playCount");

    setSortBy("relevant");
    expect(useVideoStore.getState().sortBy).toBe("relevant");
  });

  it("should handle multi-selection actions (toggle, select all, clear)", () => {
    const {
      toggleVideoSelection,
      selectAllVideos,
      clearVideoSelection,
    } = useVideoStore.getState();

    toggleVideoSelection("vid_1");
    expect(useVideoStore.getState().selectedVideoIds).toEqual(["vid_1"]);

    toggleVideoSelection("vid_2");
    expect(useVideoStore.getState().selectedVideoIds).toEqual(["vid_1", "vid_2"]);

    toggleVideoSelection("vid_1");
    expect(useVideoStore.getState().selectedVideoIds).toEqual(["vid_2"]);

    selectAllVideos(["vid_1", "vid_2", "vid_3"]);
    expect(useVideoStore.getState().selectedVideoIds).toEqual([
      "vid_1",
      "vid_2",
      "vid_3",
    ]);

    clearVideoSelection();
    expect(useVideoStore.getState().selectedVideoIds).toEqual([]);
  });

  it("should toggle tag filtering and match mode", () => {
    const {
      setSelectedTags,
      toggleSelectedTag,
      setTagMatchMode,
      clearSelectedTags,
    } = useVideoStore.getState();

    setSelectedTags(["Genre:Sci-Fi"]);
    expect(useVideoStore.getState().selectedTags).toEqual(["Genre:Sci-Fi"]);

    toggleSelectedTag("Series:Matrix");
    expect(useVideoStore.getState().selectedTags).toContain("Series:Matrix");

    setTagMatchMode("ALL");
    expect(useVideoStore.getState().tagMatchMode).toBe("ALL");

    clearSelectedTags();
    expect(useVideoStore.getState().selectedTags).toEqual([]);
  });

  it("should toggle shortcuts modal open state", () => {
    const { setShortcutsOpen, toggleShortcutsOpen } = useVideoStore.getState();

    setShortcutsOpen(true);
    expect(useVideoStore.getState().isShortcutsOpen).toBe(true);

    toggleShortcutsOpen();
    expect(useVideoStore.getState().isShortcutsOpen).toBe(false);
  });
});
