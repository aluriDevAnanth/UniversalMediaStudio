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
      className={`glass-sidebar relative hidden md:flex h-full shrink-0 flex-col overflow-hidden transition-all duration-200 ease-in-out ${
        leftSidebarExpanded ? "w-52" : "w-12"
      }`}
    >
      {/* Sidebar header — mode cycle button */}
      <div className="border-border/60 flex h-11 shrink-0 items-center justify-between border-b px-2">
        {leftSidebarExpanded && (
          <span className="text-muted truncate pl-1 text-[10px] font-bold tracking-wider uppercase">
            Navigation
          </span>
        )}
        <button
          onClick={cycleSidebarMode}
          title={`Sidebar: ${leftSidebarMode} (Click to toggle)`}
          className={`text-muted hover:text-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition hover:bg-surface-hover/70 ${
            leftSidebarExpanded ? "ml-auto" : "mx-auto"
          }`}
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
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-1.5 py-2">
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
            className={`flex h-9 w-full cursor-pointer items-center rounded-xl px-2.5 text-xs font-semibold transition-all duration-150 ${
              leftSidebarExpanded ? "justify-between" : "justify-center px-0"
            } ${
              activeTab === id
                ? "bg-primary/20 text-primary-text border-primary-border/40 border font-bold shadow-2xs backdrop-blur-md"
                : "text-muted hover:text-foreground hover:bg-surface-hover/70"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="h-4 w-4 shrink-0" />
              {leftSidebarExpanded && <span className="truncate">{label}</span>}
            </div>
            {leftSidebarExpanded && (
              <kbd className="border-border/80 bg-background/60 text-muted rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold">
                {shortcut.replace("Ctrl+", "^")}
              </kbd>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom Section: Stats & Quick Actions */}
      <div className="border-border/60 shrink-0 space-y-1 border-t p-1.5">
        {leftSidebarExpanded && (
          <div className="border-border/40 mb-1.5 space-y-1 border-b px-2 pb-2 pt-1 text-[11px]">
            <div className="text-muted flex justify-between">
              <span>Videos</span>
              <span className="text-foreground font-semibold">{videos.length}</span>
            </div>
            <div className="text-muted flex justify-between">
              <span>Tags</span>
              <span className="text-foreground font-semibold">{tags.length}</span>
            </div>
            <div className="text-muted flex justify-between">
              <span>Playlists</span>
              <span className="text-foreground font-semibold">{playlists.length}</span>
            </div>
          </div>
        )}

        {/* Tag Manager Button */}
        <button
          onClick={onOpenTagManager}
          title="Tag Manager (Ctrl+T)"
          className={`text-foreground hover:bg-surface-hover/70 flex h-9 w-full cursor-pointer items-center rounded-xl px-2.5 text-xs font-semibold backdrop-blur-xs transition ${
            leftSidebarExpanded ? "justify-between" : "justify-center px-0"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Tag className="text-primary-text h-4 w-4 shrink-0" />
            {leftSidebarExpanded && (
              <span className="truncate">Tag Manager</span>
            )}
          </div>
          {leftSidebarExpanded && (
            <kbd className="border-border/80 bg-background/60 text-muted rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold">
              ^T
            </kbd>
          )}
        </button>

        {/* Import Video Button */}
        <button
          onClick={() => importVideoFile()}
          title="Import Video File (Ctrl+O)"
          className={`bg-primary hover:bg-primary-hover text-white flex h-9 w-full cursor-pointer items-center rounded-xl px-2.5 text-xs font-bold shadow-sm transition ${
            leftSidebarExpanded ? "justify-between" : "justify-center px-0"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Upload className="h-4 w-4 shrink-0" />
            {leftSidebarExpanded && <span className="truncate">Import</span>}
          </div>
          {leftSidebarExpanded && (
            <kbd className="bg-white/20 text-white rounded border border-white/30 px-1.5 py-0.5 font-mono text-[10px] font-bold">
              ^O
            </kbd>
          )}
        </button>
      </div>
    </div>
  );
};
