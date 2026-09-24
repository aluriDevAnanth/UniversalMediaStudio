import React, { useState } from "react";
import {
  Pin,
  PanelLeftClose,
  PanelLeft,
  LayoutGrid,
  ListMusic,
  HardDrive,
  BarChart2,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { SidebarNavItem, SidebarStatsSection } from "./navigation/index";

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

  const NAV_ITEMS = [
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
  ];

  return (
    <div
      onMouseEnter={() => setLeftSidebarHovered(true)}
      onMouseLeave={() => setLeftSidebarHovered(false)}
      className={`glass-sidebar relative hidden md:flex h-full shrink-0 flex-col overflow-hidden transition-all duration-200 ease-in-out ${
        leftSidebarExpanded ? "w-52" : "w-12"
      }`}
    >
      {/* Sidebar header */}
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
        {NAV_ITEMS.map(({ id, icon, label, shortcut }) => (
          <SidebarNavItem
            key={id}
            id={id}
            icon={icon}
            label={label}
            shortcut={shortcut}
            isActive={activeTab === id}
            isExpanded={leftSidebarExpanded}
            onClick={() => setActiveTab(id)}
          />
        ))}
      </nav>

      {/* Bottom Section: Stats & Quick Actions */}
      <SidebarStatsSection
        isExpanded={leftSidebarExpanded}
        videoCount={videos.length}
        tagCount={tags.length}
        playlistCount={playlists.length}
        onOpenTagManager={onOpenTagManager}
        onImport={() => importVideoFile()}
      />
    </div>
  );
};
