import React, { useEffect, useState, useRef } from "react";
import { useVideoStore } from "./store/videoStore";
import { LoginScreen } from "./components/LoginScreen";
import { Header } from "./components/Header";
import { LeftSidebar } from "./components/LeftSidebar";
import { VideoGridView } from "./components/VideoGridView";
import { MediaDetailsPanel } from "./components/MediaDetailsPanel";
import { VideoPlayerModal } from "./components/VideoPlayerModal";
import { PlaylistsView } from "./components/PlaylistsView";
import { StorageManager } from "./components/StorageManager";
import { AnalyticsView } from "./components/AnalyticsView";
import { BundleExplorerModal } from "./components/BundleExplorerModal";
import { TagManagerDialog } from "./components/TagManagerDialog";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { ToastContainer } from "./components/ToastNotification";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { VideoRecord } from "./env";
import { Upload } from "lucide-react";

const getDraggedFileType = (
  e: React.DragEvent,
): "video" | "subtitle" | "unknown" => {
  const videoMimeTypes = [
    "video/mp4",
    "video/x-matroska",
    "video/avi",
    "video/x-msvideo",
    "video/webm",
    "video/quicktime",
    "video/x-m4v",
  ];

  const subtitleMimeTypes = ["application/x-subrip", "text/plain"];

  if (e.dataTransfer?.items?.length > 0) {
    const items = Array.from(e.dataTransfer.items);

    for (const item of items) {
      if (item.kind === "file") {
        const mimeType = item.type.toLowerCase();

        if (videoMimeTypes.includes(mimeType)) return "video";
        if (subtitleMimeTypes.includes(mimeType)) return "subtitle";

        if (mimeType.startsWith("video/")) return "video";
      }
    }
  }

  return "unknown";
};

export default function App(): React.JSX.Element {
  const {
    isAuthenticated,
    checkAuthStatus,
    activeTab,
    playingVideo,
    setPlayingVideo,
    fetchData,
    selectedVideoId,
    setSelectedVideoId,
    updateActiveImport,
    removeActiveImport,
  } = useVideoStore();

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [explorerVideo, setExplorerVideo] = useState<VideoRecord | null>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  const dragCounterRef = useRef(0);

  useEffect(() => {
    checkAuthStatus();

    if (window.api?.videos?.onProgressUpdate) {
      let updateQueue: Record<string, any> = {};
      let throttleTimeout: ReturnType<typeof setTimeout> | null = null;

      const unsub = window.api.videos.onProgressUpdate((data) => {
        if (data.percent === 100 && data.step === 4) {
          delete updateQueue[data.taskId];
          // Remove task from activeImports when complete and refresh the data
          setTimeout(() => {
            removeActiveImport(data.taskId);
            fetchData();
          }, 1000);
        } else {
          // Queue the progress update
          updateQueue[data.taskId] = data;

          // Throttle updates to React state to once every 250ms
          if (!throttleTimeout) {
            throttleTimeout = setTimeout(() => {
              Object.values(updateQueue).forEach((progress) => {
                updateActiveImport(progress);
              });
              updateQueue = {};
              throttleTimeout = null;
            }, 250);
          }
        }
      });
      return () => {
        if (typeof unsub === "function") unsub();
        if (throttleTimeout) clearTimeout(throttleTimeout);
      };
    }
    return undefined;
  }, []);

  useGlobalShortcuts({
    onOpenTagManager: () => setTagManagerOpen(true),
    onCloseModals: () => {
      if (playingVideo) {
        setPlayingVideo(null);
        return true;
      }
      if (explorerVideo) {
        setExplorerVideo(null);
        return true;
      }
      if (tagManagerOpen) {
        setTagManagerOpen(false);
        return true;
      }
      return false;
    },
  });

  useEffect(() => {
    const handleInspectBundle = (e: any) => {
      if (e.detail) {
        setExplorerVideo(e.detail);
      }
    };
    window.addEventListener("inspect-video-bundle", handleInspectBundle);
    return () =>
      window.removeEventListener("inspect-video-bundle", handleInspectBundle);
  }, []);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Handle Drag & Drop without blinking using counter ref
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();

    const type = getDraggedFileType(e);

    if (type === "subtitle") {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
      return;
    }
    if (
      e.dataTransfer.types &&
      Array.from(e.dataTransfer.types).includes("Files")
    ) {
      dragCounterRef.current += 1;
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (
      e.dataTransfer.types &&
      Array.from(e.dataTransfer.types).includes("Files")
    ) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0 || !e.relatedTarget) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const videoExtensions = [
        "mp4",
        "mkv",
        "avi",
        "webm",
        "mov",
        "m4v",
        "adaumc",
      ];

      const validFiles: File[] = [];
      const invalidFiles: File[] = [];

      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext && videoExtensions.includes(ext)) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file);
        }
      }

      if (invalidFiles.length > 0 && validFiles.length > 0) {
        const list = invalidFiles.map((f) => `- ${f.name}`).join("\n");
        alert(
          `Skipped the following unsupported files:\n${list}\n\nOnly video files (mp4, mkv, avi, webm, mov, m4v) and .adaumc containers are supported.`,
        );
      }

      if (validFiles.length === 0) return;

      const promises = validFiles.map(async (file) => {
        const filePath = (file as any).path;
        if (filePath) {
          const tempTaskId = `vid_temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          updateActiveImport({
            taskId: tempTaskId,
            fileName: file.name,
            step: 1,
            totalSteps: 4,
            percent: 1,
            log: "Initializing import...",
            etaSeconds: null,
          });
          try {
            await window.api.videos.importFilePath(filePath, tempTaskId);
          } catch (err) {
            console.error("Drag & Drop import error:", err);
          } finally {
            removeActiveImport(tempTaskId);
          }
        }
      });

      Promise.all(promises).then(() => {
        fetchData();
      });
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="bg-background text-foreground relative flex h-screen w-screen flex-col overflow-hidden transition-colors duration-200"
    >
      {/* Ambient Glassmorphic Glow Mesh Canvas */}
      <div
        style={{ contain: "strict", transform: "translate3d(0, 0, 0)" }}
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-75 dark:opacity-45 transition-opacity duration-500"
      >
        <div
          style={{ transform: "translateZ(0)" }}
          className="bg-gradient-to-br from-blue-500/30 to-indigo-600/30 absolute -top-[10%] -left-[10%] h-[550px] w-[550px] rounded-full blur-[100px]"
        />
        <div
          style={{ transform: "translateZ(0)" }}
          className="bg-gradient-to-tr from-cyan-400/25 to-sky-500/25 absolute top-[25%] -right-[12%] h-[600px] w-[600px] rounded-full blur-[110px]"
        />
        <div
          style={{ transform: "translateZ(0)" }}
          className="bg-gradient-to-tl from-purple-500/25 to-pink-500/20 absolute -bottom-[15%] left-[20%] h-[500px] w-[500px] rounded-full blur-[100px]"
        />
        <div
          style={{ transform: "translateZ(0)" }}
          className="bg-gradient-to-r from-emerald-400/15 to-teal-500/15 absolute top-[50%] left-[35%] h-[400px] w-[400px] rounded-full blur-[90px]"
        />
      </div>

      {/* Top Header Navigation */}
      <Header />

      {/* Main Content Area */}
      <main className="relative flex flex-1 overflow-hidden">
        {/* Drag & Drop Visual Overlay */}
        {isDraggingOver && (
          <div className="bg-background/90 border-primary pointer-events-none absolute inset-0 z-50 mx-1 my-2 flex flex-col items-center justify-center rounded-3xl border-4 border-dashed p-8 text-center backdrop-blur-md transition-all">
            <div className="bg-primary/20 border-primary-border/40 text-primary-text mb-4 flex h-20 w-20 animate-bounce items-center justify-center rounded-3xl border shadow-2xl">
              <Upload className="h-10 w-10" />
            </div>
            <h2 className="text-foreground text-2xl font-bold">
              Drop Video File to Process & Package
            </h2>
            <p className="text-muted mt-2 max-w-md text-sm">
              Supports .mp4, .mkv, .webm, .mov, and .adaumc files. Generates GIF
              preview (Median Cut algorithm) & 5x5 WebVTT sprites.
            </p>
          </div>
        )}

        {/* Left Navigation Sidebar */}
        <LeftSidebar onOpenTagManager={() => setTagManagerOpen(true)} />

        {/* Tab content wrapper — click outside deselects video */}
        <div
          className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (
              selectedVideoId &&
              !target.closest("[data-video-card]") &&
              !target.closest("[data-details-panel]")
            ) {
              setSelectedVideoId(null);
            }
          }}
        >
          {activeTab === "grid" && <VideoGridView />}

          {activeTab === "playlists" && <PlaylistsView />}
          {activeTab === "storage" && <StorageManager />}
          {activeTab === "analytics" && <AnalyticsView />}
        </div>

        {/* Right Details Panel */}
        {selectedVideoId && (
          <MediaDetailsPanel
            selectedVideoId={selectedVideoId}
            onInspectBundle={(video) => setExplorerVideo(video)}
          />
        )}
      </main>

      {/* Video Player Modal */}
      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
        />
      )}

      {/* Debugger Explorer Modal */}
      {explorerVideo && (
        <BundleExplorerModal
          video={explorerVideo}
          onClose={() => setExplorerVideo(null)}
        />
      )}

      {/* Tag Manager Dialog */}
      <TagManagerDialog
        open={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <ShortcutsModal />

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
}
