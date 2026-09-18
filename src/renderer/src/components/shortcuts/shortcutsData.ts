import { Sparkles, Command, Layers, PlaySquare, ListVideo } from "lucide-react";

export interface ShortcutItem {
  keys: string[];
  label: string;
  description?: string;
  category: "global" | "grid" | "player" | "playlists_tags";
}

export const SHORTCUTS: ShortcutItem[] = [
  // Global & Navigation
  {
    keys: ["Ctrl", "K"],
    label: "Focus Search Bar",
    description: "Instantly jump to search video library or tag filter",
    category: "global",
  },
  {
    keys: ["/"],
    label: "Quick Search",
    description: "Quickly focus the search bar (when not in an input)",
    category: "global",
  },
  {
    keys: ["Ctrl", "O"],
    label: "Import Video File",
    description: "Open file picker to import and process video",
    category: "global",
  },
  {
    keys: ["Ctrl", "1"],
    label: "Library Tab",
    description: "Switch to video grid library",
    category: "global",
  },
  {
    keys: ["Ctrl", "2"],
    label: "Playlists Tab",
    description: "Switch to playlists & collections view",
    category: "global",
  },
  {
    keys: ["Ctrl", "3"],
    label: "Storage Tab",
    description: "Switch to storage & disk space manager",
    category: "global",
  },
  {
    keys: ["Ctrl", "4"],
    label: "Analytics Tab",
    description: "Switch to viewing insights & stats",
    category: "global",
  },
  {
    keys: ["Ctrl", "T"],
    label: "Tag Manager",
    description: "Open Tag & Category manager dialog",
    category: "global",
  },
  {
    keys: ["Ctrl", "D"],
    label: "Toggle Theme",
    description: "Switch between Dark and Light mode",
    category: "global",
  },
  {
    keys: ["Ctrl", "L"],
    label: "Lock Studio",
    description: "Quickly lock the application with password",
    category: "global",
  },
  {
    keys: ["?"],
    label: "Shortcuts Cheatsheet",
    description: "Show this keyboard shortcuts guide (also F1 or Ctrl+/)",
    category: "global",
  },
  {
    keys: ["Esc"],
    label: "Close / Deselect",
    description: "Close active modal, deselect items, or exit focus",
    category: "global",
  },

  // Library & Grid
  {
    keys: ["↑", "↓", "←", "→"],
    label: "Navigate Grid",
    description: "Move selection focus across video cards",
    category: "grid",
  },
  {
    keys: ["Enter"],
    label: "Play Selected Video",
    description: "Open video in the built-in media player",
    category: "grid",
  },
  {
    keys: ["Space"],
    label: "Toggle Multi-Select",
    description: "Select / deselect video for batch actions",
    category: "grid",
  },
  {
    keys: ["Ctrl", "A"],
    label: "Select All Videos",
    description: "Select all visible videos in current view",
    category: "grid",
  },
  {
    keys: ["I"],
    label: "Toggle Media Details",
    description: "Open / close right-side details panel for selected video",
    category: "grid",
  },
  {
    keys: ["B"],
    label: "Bundle Explorer",
    description: "Open .adaumc bundle inspector / debugger",
    category: "grid",
  },
  {
    keys: ["Delete"],
    label: "Delete Video(s)",
    description: "Delete currently selected video or batch selection",
    category: "grid",
  },
  {
    keys: ["T"],
    label: "Quick Tag",
    description: "Open tag assignment dropdown for selected video",
    category: "grid",
  },

  // Video Player
  {
    keys: ["Space"],
    label: "Play / Pause",
    description: "Toggle video playback (also works with 'K')",
    category: "player",
  },
  {
    keys: ["←", "→"],
    label: "Seek 5 Seconds",
    description: "Rewind or forward 5 seconds",
    category: "player",
  },
  {
    keys: ["J", "L"],
    label: "Seek 10 Seconds",
    description: "Rewind (J) or forward (L) 10 seconds",
    category: "player",
  },
  {
    keys: [",", "."],
    label: "Frame Step",
    description: "Step backward (,) or forward (.) one frame when paused",
    category: "player",
  },
  {
    keys: ["↑", "↓"],
    label: "Volume Control",
    description: "Increase or decrease audio volume by 5%",
    category: "player",
  },
  {
    keys: ["M"],
    label: "Toggle Mute",
    description: "Mute or unmute audio stream",
    category: "player",
  },
  {
    keys: ["F"],
    label: "Fullscreen",
    description: "Toggle fullscreen video mode",
    category: "player",
  },
  {
    keys: ["C"],
    label: "Captions / Subtitles",
    description: "Toggle closed captions display on/off",
    category: "player",
  },
  {
    keys: ["<", ">"],
    label: "Speed Control",
    description: "Slow down (<) or speed up (>) playback rate (also [ and ])",
    category: "player",
  },
  {
    keys: ["0"],
    label: "Jump to Start",
    description: "Rewind to 00:00 (also Home key)",
    category: "player",
  },
  {
    keys: ["L"],
    label: "Toggle Event Logs",
    description: "Show / hide container metadata & packaging logs drawer (or `)",
    category: "player",
  },
  {
    keys: ["T"],
    label: "Edit Tags",
    description: "Toggle video tag editor within the player modal",
    category: "player",
  },

  // Playlists & Tags
  {
    keys: ["N"],
    label: "New Playlist",
    description: "Create a new custom playlist (in Playlists view)",
    category: "playlists_tags",
  },
  {
    keys: ["Enter"],
    label: "Submit / Save",
    description: "Confirm creating tag, renaming, or creating playlist",
    category: "playlists_tags",
  },
];

export const CATEGORIES = [
  { id: "all", label: "All Shortcuts", icon: Sparkles },
  { id: "global", label: "Global & Navigation", icon: Command },
  { id: "grid", label: "Library & Grid", icon: Layers },
  { id: "player", label: "Video Player", icon: PlaySquare },
  { id: "playlists_tags", label: "Playlists & Tags", icon: ListVideo },
];
