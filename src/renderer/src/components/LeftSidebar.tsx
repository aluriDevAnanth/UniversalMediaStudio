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
  const {
    activeTab,
    setActiveTab,
    videos,
    tags,
    playlists,
    importVideoFile,
  } = useVideoStore();

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
      className={`relative flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface transition-all duration-300 ease-in-out ${leftSidebarExpanded ? "w-52" : "w-10"} `}
    >
      {/* Sidebar header — mode cycle button */}
      <div className="flex items-center justify-between border-b border-border px-1 py-3">
        {leftSidebarExpanded && (
          <span className="truncate pl-1 text-[10px] font-bold uppercase tracking-widest text-muted">
            Navigation
          </span>
        )}
        <button
          onClick={cycleSidebarMode}
          title={`Sidebar: ${leftSidebarMode} — click to cycle`}
          className={`cursor-pointer rounded-lg px-0 py-1.5 text-muted transition hover:scale-110 hover:text-foreground ${leftSidebarExpanded ? "ml-auto mr-3" : "mx-auto"} `}
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
      <nav className="flex flex-1 flex-col gap-1 overflow-hidden p-2">
        {[
          { id: "grid" as const, icon: LayoutGrid, label: "Library" },
          { id: "playlists" as const, icon: ListMusic, label: "Playlists" },
          { id: "storage" as const, icon: HardDrive, label: "Storage" },
          { id: "analytics" as const, icon: BarChart2, label: "Analytics" },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            title={label}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-1 py-3 text-xs font-semibold transition-all duration-150 hover:scale-110 ${
              activeTab === id
                ? "bg-primary/15 text-primary-text"
                : "text-muted hover:text-foreground"
            } `}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {leftSidebarExpanded && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Tag Manager + Import at bottom */}
      <div className="mb-2 space-y-1 border-t border-border">
        {leftSidebarExpanded && (
          <div className="space-y-1 px-2 pb-2">
            <div className="flex justify-between text-[12px] text-muted">
              <span>Videos</span>
              <span className="font-bold text-foreground">{videos.length}</span>
            </div>
            <div className="flex justify-between text-[12px] text-muted">
              <span>Tags</span>
              <span className="font-bold text-foreground">{tags.length}</span>
            </div>
            <div className="flex justify-between text-[12px] text-muted">
              <span>Playlists</span>
              <span className="font-bold text-foreground">
                {playlists.length}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={onOpenTagManager}
          title="Tag Manager"
          className="hover:bg-primary/10 flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-surface-hover px-2 py-2 text-xs font-semibold text-foreground transition"
        >
          <Tag className="h-4 w-4 shrink-0 text-primary-text" />
          {leftSidebarExpanded && (
            <span className="ml-2 truncate">Tag Manager</span>
          )}
        </button>
        <button
          onClick={() => importVideoFile()}
          title="Import video"
          className="mb-2 flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-primary px-2.5 py-2 text-xs font-bold text-white transition hover:bg-primary-hover"
        >
          <Upload className="h-4 w-4 shrink-0" />
          {leftSidebarExpanded && <span className="ml-2 truncate">Import</span>}
        </button>
      </div>
    </div>
  );
};
