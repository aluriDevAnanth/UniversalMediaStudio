import React, { useEffect, useState } from "react";
import {
  X,
  Folder,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  FileCode,
  HardDrive,
  Terminal,
  Code,
  AlertTriangle,
} from "lucide-react";
import { VideoRecord } from "../env";

interface BundleExplorerModalProps {
  video: VideoRecord;
  onClose: () => void;
}

export const BundleExplorerModal: React.FC<BundleExplorerModalProps> = ({
  video,
  onClose,
}) => {
  const [bundleData, setBundleData] = useState<{
    metadata: any;
    payloadStartOffset: number;
    error?: string;
  } | null>(null);
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>("thumbnail");
  const [logFilter, setLogFilter] = useState<"all" | "error" | "warn" | "info" | "debug">("all");
  const [assetContent, setAssetContent] = useState<{
    mimeType: string;
    totalSize: number;
    text: string;
    base64: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBundle() {
      if (!video.bundlePath && !video.id) return;
      setLoading(true);
      const res = await window.api.bundle.inspect(
        video.bundlePath || `${video.id}.adaumc`,
      );
      if (res) {
        setBundleData(res);
        const assetsObj = res.metadata?.assets || (res as any).assets || {};
        const keys = Object.keys(assetsObj);
        if (keys.length > 0) {
          // Default to thumbnail or non-video asset to prevent instant video load
          const defaultKey = keys.find((k) => k !== "video") || keys[0];
          setSelectedAssetKey(defaultKey);
        }
      }
      setLoading(false);
    }
    loadBundle();
  }, [video]);

  useEffect(() => {
    async function loadAsset() {
      if (
        !selectedAssetKey ||
        selectedAssetKey === "video" ||
        selectedAssetKey === "logs"
      )
        return;

      const assetsMap = bundleData?.metadata?.assets || (bundleData as any)?.assets || {};
      const mime = assetsMap[selectedAssetKey]?.mimeType || "";
      if (
        selectedAssetKey === "gif" ||
        selectedAssetKey === "thumbnail" ||
        selectedAssetKey.includes("sprite") ||
        mime.startsWith("image/")
      ) {
        setAssetContent(null);
        return;
      }

      const res = await window.api.bundle.readAsset(
        video.bundlePath || `${video.id}.adaumc`,
        selectedAssetKey,
      );
      if (res && !res.error) {
        setAssetContent(res);
      }
    }
    loadAsset();
  }, [selectedAssetKey, video, bundleData]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getAssetIcon = (key: string, mime?: string) => {
    if (key === "video" || mime?.includes("video"))
      return <VideoIcon className="w-4 h-4 text-indigo-400" />;
    if (
      key === "gif" ||
      key === "thumbnail" ||
      key.includes("sprite") ||
      mime?.includes("image")
    )
      return <ImageIcon className="w-4 h-4 text-emerald-400" />;
    if (key === "vtt" || mime?.includes("vtt"))
      return <FileCode className="w-4 h-4 text-amber-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const assetsMap =
    bundleData?.metadata?.assets || (bundleData as any)?.assets || {};
  const activeAssetInfo = assetsMap[selectedAssetKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 md:p-8 animate-fade-in">
      <div className="w-full max-w-5xl bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh] transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/60">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary-text text-xs font-mono font-bold border border-primary-border/40 flex items-center gap-1.5 animate-pulse">
              <HardDrive className="w-3.5 h-3.5" />
              .adaumc Explorer
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground truncate max-w-lg">
                {video.title}
              </h2>
              <p className="text-[10px] text-muted font-mono">
                Magic: ADAUMC (0x414441554D43) • Payload Start Offset:{" "}
                {bundleData?.payloadStartOffset || 10} bytes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover text-muted hover:text-foreground rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Explorer Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Asset Directory */}
          <div className="w-72 bg-background/80 border-r border-border p-4 flex flex-col gap-2 overflow-y-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted mb-2 px-2">
              <Folder className="w-4 h-4 text-primary-text" />
              <span>Bundle Files ({Object.keys(assetsMap).length})</span>
            </div>

            {loading ? (
              <div className="text-xs text-muted p-4">
                Inspecting container index...
              </div>
            ) : bundleData?.error ? (
              <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="truncate">{bundleData.error}</span>
              </div>
            ) : (
              Object.entries(assetsMap).map(([key, info]: [string, any]) => {
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
                    onClick={() => setSelectedAssetKey(key)}
                    className={`flex items-center justify-between p-3 rounded-xl text-left border transition cursor-pointer ${
                      isSelected
                        ? "bg-primary/20 border-primary-border/45 text-primary-text shadow-md"
                        : "bg-surface border-border hover:bg-surface-hover text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getAssetIcon(key, info.mimeType)}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {info.filename || `${key}`}
                        </p>
                        <p className="text-[10px] text-muted font-mono">
                          Offset: 0x
                          {(info.offset || 0).toString(16).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted shrink-0 ml-2">
                      {formatBytes(fileLength)}
                    </span>
                  </button>
                );
              })
            )}

            {/* Ndjson Logs File Item */}
            <button
              onClick={() => setSelectedAssetKey("logs")}
              className={`flex items-center justify-between p-3 rounded-xl text-left border transition cursor-pointer mt-auto ${
                selectedAssetKey === "logs"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-500"
                  : "bg-surface border-border hover:bg-surface-hover text-muted"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-xs font-semibold">
                    container_telemetry.ndjson
                  </p>
                  <p className="text-[10px] text-muted font-mono">
                    Execution Log
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Right Main Panel: File Debugger & Previewer */}
          <div className="flex-1 bg-surface-hover/30 p-6 overflow-y-auto flex flex-col">
            {selectedAssetKey === "logs" ? (
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Terminal className="w-4 h-4 text-amber-500" />
                    <span>Container Execution Telemetry Logs</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {(["all", "error", "warn", "info", "debug"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setLogFilter(filter)}
                        className={`px-2 py-1 rounded-md font-semibold capitalize transition ${
                          logFilter === filter
                            ? "bg-amber-500 text-black shadow"
                            : "bg-surface border border-border text-muted hover:text-foreground"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 bg-background border border-border rounded-xl p-4 font-mono text-xs text-primary-text space-y-2 overflow-y-auto max-h-[500px]">
                  {(bundleData?.metadata?.logs || [])
                    .map((rawLog: string, idx: number) => {
                      let parsed: any = null;
                      try {
                        parsed = JSON.parse(rawLog);
                      } catch (e) {
                        parsed = {
                          t: "",
                          level: "info",
                          event: "info",
                          step: 0,
                          stepName: "Info",
                          msg: rawLog,
                        };
                      }
                      return { parsed, rawLog, idx };
                    })
                    .filter(({ parsed }: any) => {
                      if (logFilter === "all") return true;
                      const level = parsed.level || (parsed.event === "error" ? "error" : parsed.event === "warn" ? "warn" : "info");
                      return level === logFilter;
                    })
                    .map(({ parsed, idx }: any) => {
                      const level = parsed.level || (parsed.event === "error" ? "error" : parsed.event === "warn" ? "warn" : "info");
                      const timeStr = parsed.t ? new Date(parsed.t).toLocaleTimeString() : "";

                      let badgeBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                      if (level === "error") badgeBg = "bg-red-500/10 text-red-400 border-red-500/20";
                      else if (level === "warn") badgeBg = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                      else if (level === "debug") badgeBg = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

                      return (
                        <div
                          key={idx}
                          className="flex gap-2.5 items-start p-2 rounded-lg bg-surface/50 border border-border/40 hover:bg-surface transition text-foreground"
                        >
                          <span className="text-muted text-[10px] select-none w-6 text-right pt-0.5 font-mono">
                            {idx + 1}
                          </span>
                          <div className="flex-1 flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {timeStr && <span className="text-muted text-[10px]">[{timeStr}]</span>}
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${badgeBg}`}>
                                {level}
                              </span>
                              {parsed.stepName && (
                                <span className="px-1.5 py-0.5 text-[9px] rounded bg-border/60 text-muted">
                                  {parsed.stepName}
                                </span>
                              )}
                              <span className="truncate">{parsed.msg || parsed.event}</span>
                              {parsed.memoryMb && (
                                <span className="ml-auto text-[10px] text-muted font-mono">
                                  {parsed.memoryMb}MB RAM
                                </span>
                              )}
                            </div>

                            {parsed.details && Object.keys(parsed.details).length > 0 && (
                              <details className="mt-1 text-[11px] text-muted">
                                <summary className="cursor-pointer hover:text-amber-400 transition select-none text-[10px] font-semibold">
                                  View Step Diagnostics
                                </summary>
                                <pre className="mt-1 p-2 rounded.xl bg-background border border-border/60 overflow-x-auto text-[10px] text-cyan-300 font-mono">
                                  {JSON.stringify(parsed.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : activeAssetInfo ? (
              <div className="flex-1 flex flex-col gap-4">
                {/* File Metadata Header */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    {getAssetIcon(selectedAssetKey, activeAssetInfo.mimeType)}
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {activeAssetInfo.filename || selectedAssetKey}
                      </h3>
                      <p className="text-[10px] text-muted font-mono">
                        Key: '{selectedAssetKey}' • Mime:{" "}
                        {activeAssetInfo.mimeType || "unknown"} • Size:{" "}
                        {formatBytes(
                          activeAssetInfo.length || activeAssetInfo.size || 0,
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-primary-text bg-primary/10 border border-primary-border/25 px-2.5 py-1 rounded-lg">
                    Payload Offset: {activeAssetInfo.offset} B
                  </span>
                </div>

                {/* Live File Previewer */}
                <div className="flex-1 bg-background border border-border rounded-xl overflow-hidden flex items-center justify-center p-4 relative min-h-[350px]">
                  {selectedAssetKey === "video" ? (
                    <video
                      controls
                      src={`adaumc://${video.id}/video`}
                      className="max-w-full max-h-[420px] rounded-lg shadow-xl"
                    />
                  ) : selectedAssetKey === "gif" ||
                    selectedAssetKey === "thumbnail" ||
                    selectedAssetKey.includes("sprite") ? (
                    <img
                      src={`adaumc://${video.id}/${selectedAssetKey}`}
                      alt={selectedAssetKey}
                      className="max-w-full max-h-[420px] object-contain rounded-lg shadow-xl border border-slate-800"
                    />
                  ) : assetContent?.text ? (
                    <div className="w-full h-full font-mono text-xs text-amber-300 bg-slate-950 p-4 overflow-y-auto text-left max-h-[420px]">
                      <pre className="whitespace-pre-wrap">
                        {assetContent.text}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono">
                      Binary asset slice loaded (
                      {formatBytes(
                        activeAssetInfo.length || activeAssetInfo.size || 0,
                      )}
                      )
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Code className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs">
                  Select a file from the bundle index directory on the left to
                  inspect.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
