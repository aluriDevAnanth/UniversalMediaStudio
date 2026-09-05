import React, { useRef, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  ArrowUpDown,
  Sparkles,
  Clock,
  Calendar,
  ArrowDownAZ,
  Flame,
  Check,
  ChevronDown,
} from "lucide-react";
import { useVideoStore, SortOption } from "../store/videoStore";

interface SortDropdownProps {
  className?: string;
}

const SORT_OPTIONS: {
  id: SortOption;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "relevant",
    label: "Relevant",
    description: "Hybrid AI recommendation",
    icon: Sparkles,
  },
  {
    id: "newest",
    label: "Newest Added",
    description: "Recently imported",
    icon: Calendar,
  },
  {
    id: "oldest",
    label: "Oldest Added",
    description: "First imported",
    icon: Clock,
  },
  {
    id: "title",
    label: "Title (A–Z)",
    description: "Alphabetical order",
    icon: ArrowDownAZ,
  },
  {
    id: "duration",
    label: "Duration",
    description: "Longest runtime",
    icon: Clock,
  },
  {
    id: "playCount",
    label: "Most Played",
    description: "Highest view count",
    icon: Flame,
  },
];

export const SortDropdown: React.FC<SortDropdownProps> = ({
  className = "",
}) => {
  const { sortBy, setSortBy } = useVideoStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [portalCoords, setPortalCoords] = useState<{
    top: number;
    left: number;
  }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    if (!dropdownOpen || !triggerRef.current) return;

    const updateCoords = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const panelWidth = 220;

      let top = rect.bottom + 6;
      let left = rect.left;

      if (window.innerWidth - rect.left < panelWidth) {
        left = Math.max(10, rect.right - panelWidth);
      }

      setPortalCoords({ top, left });
    };

    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentOption =
    SORT_OPTIONS.find((opt) => opt.id === sortBy) || SORT_OPTIONS[0];
  const CurrentIcon = currentOption.icon;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setDropdownOpen((o) => !o)}
        title={`Sorted by: ${currentOption.label}`}
        className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
          sortBy === "relevant"
            ? "glass-pill text-primary-text border-primary-border/40 hover:bg-primary/20"
            : "glass-pill text-foreground hover:bg-surface-hover/70"
        }`}
      >
        <ArrowUpDown className="h-3 w-3 text-muted" />
        <CurrentIcon className="h-3.5 w-3.5 text-primary-text" />
        <span className="truncate">{currentOption.label}</span>
        <ChevronDown
          className={`h-3 w-3 text-muted transition-transform duration-200 ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {dropdownOpen &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: portalCoords.top,
              left: portalCoords.left,
              width: 220,
              zIndex: 9999,
            }}
            className="glass-modal animate-fade-in flex flex-col overflow-hidden rounded-xl p-1 shadow-2xl"
          >
            <div className="border-border/60 text-muted border-b px-2.5 py-1.5 text-[10px] font-bold tracking-wider uppercase">
              Sort Videos By
            </div>

            <div className="flex flex-col gap-0.5 p-0.5">
              {SORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = sortBy === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.id);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                      isSelected
                        ? "bg-primary/20 text-primary-text font-bold"
                        : "text-foreground hover:bg-surface-hover/70 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`h-3.5 w-3.5 ${
                          isSelected ? "text-primary-text" : "text-muted"
                        }`}
                      />
                      <div>
                        <div className="text-xs leading-none">{opt.label}</div>
                        <div className="text-[10px] font-normal text-muted leading-tight mt-0.5">
                          {opt.description}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="text-primary-text h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
