import React from "react";
import {
  LayoutGrid,
  ListMusic,
  HardDrive,
  BarChart2,
  Tag,
  Upload,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";

interface MobileBottomNavProps {
  onOpenTagManager: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenTagManager,
}) => {
  const { activeTab, setActiveTab, importVideoFile } = useVideoStore();

  const navItems = [
    {
      id: "grid" as const,
      icon: LayoutGrid,
      label: "Library",
    },
    {
      id: "playlists" as const,
      icon: ListMusic,
      label: "Playlists",
    },
    {
      id: "storage" as const,
      icon: HardDrive,
      label: "Storage",
    },
    {
      id: "analytics" as const,
      icon: BarChart2,
      label: "Analytics",
    },
  ];

  return (
    <div className="glass-header md:hidden sticky bottom-0 z-40 flex h-14 w-full shrink-0 items-center justify-around border-t px-2 backdrop-blur-xl">
      {navItems.map(({ id, icon: Icon, label }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-semibold transition active:scale-95 ${
              isActive
                ? "text-primary-text font-bold"
                : "text-muted hover:text-foreground"
            }`}
          >
            <div
              className={`flex h-7 w-12 items-center justify-center rounded-xl transition ${
                isActive ? "bg-primary/20 shadow-xs" : ""
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
            </div>
            <span className="truncate">{label}</span>
          </button>
        );
      })}

      {/* Tag Manager Action */}
      <button
        onClick={onOpenTagManager}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-semibold text-muted hover:text-foreground transition active:scale-95"
      >
        <div className="flex h-7 w-12 items-center justify-center rounded-xl">
          <Tag className="text-primary-text h-4 w-4" />
        </div>
        <span className="truncate">Tags</span>
      </button>

      {/* Import Action */}
      <button
        onClick={() => importVideoFile()}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-bold text-primary transition active:scale-95"
      >
        <div className="bg-primary flex h-7 w-12 items-center justify-center rounded-xl text-white shadow-md">
          <Upload className="h-4 w-4" />
        </div>
        <span className="truncate">Import</span>
      </button>
    </div>
  );
};
