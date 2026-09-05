import React, { useState } from "react";
import {
  Pin,
  PanelLeftClose,
  PanelLeft,
  LayoutGrid,
  ListMusic,
  HardDrive,
  BarChart2,
  Tag,
  Upload,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";

interface LeftSidebarProps {
  onOpenTagManager: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onOpenTagManager,
}) => {
  const { activeTab, setActiveTab, videos, tags, playlists, importVideoFile } =
    useVideoStore();

  type SidebarMode = "collapsed" | "hover" | "pinned";
  const [leftSidebarMode, setLeftSidebarMode] = useState<SidebarMode>("hover");
  const [leftSidebarHovered, setLeftSidebarHovered] = useState(false);

  const cycleSidebarMode = () => {
    setLeftSidebarMode((prev) => {
      if (prev === "collapsed") return "hover";
      if (prev === "hover") return "pinned";
      return "collapsed";
    });
  };

  const leftSidebarExpanded =
    leftSidebarMode === "pinned" ||
    (leftSidebarMode === "hover" && leftSidebarHovered);

  return (
    <div
      onMouseEnter={() => setLeftSidebarHovered(true)}
      onMouseLeave={() => setLeftSidebarHovered(false)}
      className={`glass-sidebar relative flex h-full shrink-0 flex-col overflow-hidden transition-all duration-300 ease-in-out ${leftSidebarExpanded ? "w-52" : "w-10"} `}
    >
      {/* Sidebar header — mode cycle button */}
      <div className="border-border/60 flex items-center justify-between border-b px-1 py-3">
        {leftSidebarExpanded && (
          <span className="text-muted truncate pl-1 text-[10px] font-bold tracking-widest uppercase">
            Navigation
          </span>
        )}
        <button
          onClick={cycleSidebarMode}
          title={`Sidebar: ${leftSidebarMode} — click to cycle`}
          className={`text-muted hover:text-foreground cursor-pointer rounded-lg px-0 py-1.5 transition hover:scale-110 ${leftSidebarExpanded ? "mr-3 ml-auto" : "mx-auto"} `}
        >
          {leftSidebarMode === "pinned" ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : leftSidebarMode === "hover" ? (
            <Pin className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 overflow-hidden px-1 py-2">
        {[
          {
            id: "grid" as const,
            icon: LayoutGrid,
            label: "Library",
            shortcut: "Ctrl+1",
          },
          {
            id: "playlists" as const,
            icon: ListMusic,
            label: "Playlists",
            shortcut: "Ctrl+2",
          },
          {
            id: "storage" as const,
            icon: HardDrive,
            label: "Storage",
            shortcut: "Ctrl+3",
          },
          {
            id: "analytics" as const,
            icon: BarChart2,
            label: "Analytics",
            shortcut: "Ctrl+4",
          },
        ].map(({ id, icon: Icon, label, shortcut }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            title={`${label} (${shortcut})`}
            className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-2 py-3 text-xs font-semibold transition-all duration-150 ${
              activeTab === id
                ? "bg-primary/20 text-primary-text border-primary-border/40 border shadow-2xs backdrop-blur-md font-bold"
                : "text-muted hover:text-foreground hover:bg-surface-hover/70"
            } `}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0" />
              {leftSidebarExpanded && <span className="truncate">{label}</span>}
            </div>
            {leftSidebarExpanded && (
              <kbd className="border-border/80 bg-background/60 text-muted hidden rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold group-hover:inline-block sm:inline-block">
                {shortcut.replace("Ctrl+", "^")}
              </kbd>
            )}
          </button>
        ))}
      </nav>

      {/* Tag Manager + Import at bottom */}
      <div className="border-border mb-2 space-y-1 border-t pt-1">
        {leftSidebarExpanded && (
          <div className="space-y-1 px-2 pb-2">
            <div className="text-muted flex justify-between text-[12px]">
              <span>Videos</span>
              <span className="text-foreground font-bold">{videos.length}</span>
            </div>
            <div className="text-muted flex justify-between text-[12px]">
              <span>Tags</span>
              <span className="text-foreground font-bold">{tags.length}</span>
            </div>
            <div className="text-muted flex justify-between text-[12px]">
              <span>Playlists</span>
              <span className="text-foreground font-bold">
                {playlists.length}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={onOpenTagManager}
          title="Tag Manager (Ctrl+T)"
          className="text-foreground hover:bg-surface-hover/70 flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition backdrop-blur-xs"
        >
          <div className="flex items-center gap-2.5">
            <Tag className="text-primary-text h-4 w-4 shrink-0" />
            {leftSidebarExpanded && (
              <span className="truncate">Tag Manager</span>
            )}
          </div>
          {leftSidebarExpanded && (
            <kbd className="border-border/80 bg-background/60 text-muted rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold">
              ^T
            </kbd>
          )}
        </button>
        <button
          onClick={() => importVideoFile()}
          title="Import Video File (Ctrl+O)"
          className="bg-primary hover:bg-primary-hover mb-2 flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold text-white shadow-md transition"
        >
          <div className="flex items-center gap-2.5">
            <Upload className="h-4 w-4 shrink-0" />
            {leftSidebarExpanded && <span className="truncate">Import</span>}
          </div>
          {leftSidebarExpanded && (
            <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white/90">
              ^O
            </kbd>
          )}
        </button>
      </div>
    </div>
  );
};
