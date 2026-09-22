import React from "react";
import { Folder, AlertTriangle, Terminal, Video as VideoIcon, Image as ImageIcon, FileCode, FileText } from "lucide-react";

export interface BundleSidebarProps {
  assetsMap: Record<string, any>;
  selectedAssetKey: string;
  loading: boolean;
  error?: string;
  onSelectAssetKey: (key: string) => void;
}

export const BundleSidebar: React.FC<BundleSidebarProps> = ({
  assetsMap,
  selectedAssetKey,
  loading,
  error,
  onSelectAssetKey,
}) => {
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getAssetIcon = (key: string, mime?: string) => {
    if (key === "video" || mime?.includes("video"))
      return <VideoIcon className="h-4 w-4 text-indigo-400" />;
    if (
      key === "gif" ||
      key === "thumbnail" ||
      key.includes("sprite") ||
      mime?.includes("image")
    )
      return <ImageIcon className="h-4 w-4 text-emerald-400" />;
    if (key === "vtt" || mime?.includes("vtt"))
      return <FileCode className="h-4 w-4 text-amber-400" />;
    return <FileText className="h-4 w-4 text-slate-400" />;
  };

  return (
    <div className="bg-background/80 border-border flex w-full md:w-64 lg:w-72 shrink-0 flex-col gap-2 border-b md:border-b-0 md:border-r p-2 max-h-44 md:max-h-none">
      <div className="text-muted flex items-center gap-2 px-2 text-xs font-semibold">
        <Folder className="text-primary-text h-4 w-4" />
        <span>Bundle Files ({Object.keys(assetsMap).length})</span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {loading ? (
          <div className="text-muted p-2 text-xs">
            Inspecting container index...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-500">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        ) : (
          Object.entries(assetsMap).map(([key, info]: [string, any]) => {
            if (info.filename?.split(".")[1] === "ndjson") {
              return null;
            }
            const isSelected = selectedAssetKey === key;
            const fileLength =
              info.length !== undefined
                ? info.length
                : info.size !== undefined
                  ? info.size
                  : 0;
            return (
              <button
                key={key}
                onClick={() => onSelectAssetKey(key)}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-2 text-left transition ${
                  isSelected
                    ? "bg-primary/20 border-primary-border/45 text-primary-text shadow-md"
                    : "bg-surface border-border hover:bg-surface-hover text-foreground"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {getAssetIcon(key, info.mimeType)}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">
                      {info.filename || `${key}`}
                    </p>
                    <p className="text-muted font-mono text-[10px]">
                      Offset: 0x
                      {(info.offset || 0).toString(16).toUpperCase()}
                    </p>
                  </div>
                </div>
                <span className="text-muted ml-2 shrink-0 font-mono text-[10px]">
                  {formatBytes(fileLength)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Ndjson Logs File Item */}
      <button
        onClick={() => onSelectAssetKey("logs")}
        className={`mt-auto flex cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition ${
          selectedAssetKey === "logs"
            ? "border-amber-500/50 bg-amber-500/20 text-amber-500"
            : "bg-surface border-border hover:bg-surface-hover text-muted"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="h-4 w-4 text-amber-500" />
          <div>
            <p className="text-xs font-semibold">
              container_telemetry.ndjson
            </p>
            <p className="text-muted font-mono text-[10px]">
              Execution Log
            </p>
          </div>
        </div>
      </button>
    </div>
  );
};
