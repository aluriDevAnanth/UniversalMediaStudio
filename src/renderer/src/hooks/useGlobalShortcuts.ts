import { useEffect } from "react";
import { useVideoStore } from "../store/videoStore";

export function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable
  );
}

interface GlobalShortcutsProps {
  onOpenTagManager: () => void;
  onCloseModals: () => boolean; // returns true if a modal was closed
}

export function useGlobalShortcuts({
  onOpenTagManager,
  onCloseModals,
}: GlobalShortcutsProps) {
  const {
    setActiveTab,
    importVideoFile,
    toggleTheme,
    lockApp,
    isShortcutsOpen,
    setShortcutsOpen,
    toggleShortcutsOpen,
    clearVideoSelection,
    selectedVideoId,
    setSelectedVideoId,
  } = useVideoStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = isInputElement(e.target);
      const isCtrl = e.ctrlKey || e.metaKey;

      // ─── 1. ESCAPE: Hierarchical dismissal ───
      if (e.key === "Escape") {
        // If shortcuts modal is open, close it
        if (isShortcutsOpen) {
          e.preventDefault();
          setShortcutsOpen(false);
          return;
        }

        // Try closing other open modals (Video player, tag manager, explorer)
        const closed = onCloseModals();
        if (closed) {
          e.preventDefault();
          return;
        }

        // If inside an input, blur it
        if (isInput && e.target instanceof HTMLElement) {
          e.preventDefault();
          e.target.blur();
          return;
        }

        // Deselect video and clear search if present
        if (selectedVideoId) {
          e.preventDefault();
          setSelectedVideoId(null);
          return;
        }

        clearVideoSelection();
        return;
      }

      // ─── 2. Search Focus: Ctrl+K / Ctrl+F / '/' ───
      if ((isCtrl && (e.key.toLowerCase() === "k" || e.key.toLowerCase() === "f")) || (!isCtrl && !e.altKey && !isInput && e.key === "/")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("focus-search-input"));
        return;
      }

      // ─── 3. Shortcuts Cheatsheet Modal: '?' / F1 / Ctrl+/ ───
      if (
        (!isCtrl && !isInput && (e.key === "?" || e.key === "F1")) ||
        (isCtrl && e.key === "/")
      ) {
        e.preventDefault();
        toggleShortcutsOpen();
        return;
      }

      // ─── 4. App-Wide Actions with Ctrl/Cmd ───
      if (isCtrl) {
        switch (e.key.toLowerCase()) {
          case "o":
          case "i":
            if (e.shiftKey) break; // Don't block Ctrl+Shift+I dev tools
            e.preventDefault();
            importVideoFile();
            return;

          case "t":
            if (!e.shiftKey) {
              e.preventDefault();
              onOpenTagManager();
              return;
            }
            break;

          case "d":
            e.preventDefault();
            toggleTheme();
            return;

          case "l":
            e.preventDefault();
            lockApp();
            return;

          case "1":
            e.preventDefault();
            setActiveTab("grid");
            return;

          case "2":
            e.preventDefault();
            setActiveTab("playlists");
            return;

          case "3":
            e.preventDefault();
            setActiveTab("storage");
            return;

          case "4":
            e.preventDefault();
            setActiveTab("analytics");
            return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isShortcutsOpen,
    setShortcutsOpen,
    toggleShortcutsOpen,
    onOpenTagManager,
    onCloseModals,
    setActiveTab,
    importVideoFile,
    toggleTheme,
    lockApp,
    clearVideoSelection,
    selectedVideoId,
    setSelectedVideoId,
  ]);
}
