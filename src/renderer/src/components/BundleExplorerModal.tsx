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
  const [logFilter, setLogFilter] = useState<
    "all" | "error" | "warn" | "info" | "debug"
  >("all");
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

      const assetsMap =
        bundleData?.metadata?.assets || (bundleData as any)?.assets || {};
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

  const assetsMap =
    bundleData?.metadata?.assets || (bundleData as any)?.assets || {};
  const activeAssetInfo = assetsMap[selectedAssetKey];

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md md:p-8">
      <div className="bg-surface border-border flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl transition-colors duration-200">
        {/* Header */}
        <div className="border-border bg-background/60 flex items-center justify-between border-b p-2">
          <div className="flex items-center gap-3">
            <span className="bg-primary/20 text-primary-text border-primary-border/40 flex animate-pulse items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs font-bold">
              <HardDrive className="h-3.5 w-3.5" />
              .adaumc Explorer
            </span>
            <div>
              <h2 className="text-foreground max-w-lg truncate text-sm font-bold">
                {video.title}
              </h2>
              <p className="text-muted font-mono text-[10px]">
                Magic: ADAUMC (0x414441554D43) • Payload Start Offset:{" "}
                {bundleData?.payloadStartOffset || 10} bytes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="hover:bg-surface-hover text-muted hover:text-foreground cursor-pointer rounded-xl p-2 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File Explorer Split View */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar: Asset Directory */}
          <div className="bg-background/80 border-border flex w-70 flex-col gap-2 border-r p-2">
            <div className="text-muted flex items-center gap-2 px-2 text-xs font-semibold">
              <Folder className="text-primary-text h-4 w-4" />
              <span>Bundle Files ({Object.keys(assetsMap).length})</span>
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
              {loading ? (
                <div className="text-muted p-2 text-xs">
                  Inspecting container index...
                </div>
              ) : bundleData?.error ? (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-500">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{bundleData.error}</span>
                </div>
              ) : (
                Object.entries(assetsMap).map(([key, info]: [string, any]) => {
                  if (info.filename.split(".")[1] == "ndjson") {
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
                      onClick={() => setSelectedAssetKey(key)}
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
              onClick={() => setSelectedAssetKey("logs")}
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

          {/* Right Main Panel: File Debugger & Previewer */}
          <div className="bg-surface-hover/30 flex flex-1 flex-col overflow-y-auto p-2">
            {selectedAssetKey === "logs" ? (
              <div className="flex flex-1 flex-col gap-1">
                <div className="border-border mb-1 flex items-center justify-between border-b">
                  <div className="text-foreground flex items-center gap-2 text-xs font-bold">
                    <Terminal className="h-4 w-4 text-amber-500" />
                    <span>Container Execution Telemetry Logs</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {(["all", "error", "warn", "info", "debug"] as const).map(
                      (filter) => (
                        <button
                          key={filter}
                          onClick={() => setLogFilter(filter)}
                          className={`rounded-md px-2 py-1 font-semibold capitalize transition ${
                            logFilter === filter
                              ? "bg-amber-500 text-black shadow"
                              : "bg-surface border-border text-muted hover:text-foreground border"
                          }`}
                        >
                          {filter}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="bg-background border-border text-primary-text mb-2 flex-1 space-y-2 overflow-y-auto rounded-xl border p-2 font-mono text-xs">
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
                      const level =
                        parsed.level ||
                        (parsed.event === "error"
                          ? "error"
                          : parsed.event === "warn"
                            ? "warn"
                            : "info");
                      return level === logFilter;
                    })
                    .map(({ parsed, idx }: any) => {
                      const level =
                        parsed.level ||
                        (parsed.event === "error"
                          ? "error"
                          : parsed.event === "warn"
                            ? "warn"
                            : "info");
                      const timeStr = parsed.t
                        ? new Date(parsed.t).toLocaleTimeString()
                        : "";

                      let badgeBg =
                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                      if (level === "error")
                        badgeBg =
                          "bg-red-500/10 text-red-400 border-red-500/20";
                      else if (level === "warn")
                        badgeBg =
                          "bg-amber-500/10 text-amber-400 border-amber-500/20";
                      else if (level === "debug")
                        badgeBg =
                          "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

                      return (
                        <div
                          key={idx}
                          className="bg-surface/50 border-border/40 hover:bg-surface text-foreground flex items-start gap-2.5 rounded-lg border p-2 transition"
                        >
                          <span className="text-muted w-6 pt-0.5 text-right font-mono text-[10px] select-none">
                            {idx + 1}
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {timeStr && (
                                <span className="text-muted text-[10px]">
                                  [{timeStr}]
                                </span>
                              )}
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${badgeBg}`}
                              >
                                {level}
                              </span>
                              {parsed.stepName && (
                                <span className="bg-border/60 text-muted rounded px-1.5 py-0.5 text-[9px]">
                                  {parsed.stepName}
                                </span>
                              )}
                              <span className="truncate">
                                {parsed.msg || parsed.event}
                              </span>
                              {parsed.memoryMb && (
                                <span className="text-muted ml-auto font-mono text-[10px]">
                                  {parsed.memoryMb}MB RAM
                                </span>
                              )}
                            </div>

                            {parsed.details &&
                              Object.keys(parsed.details).length > 0 && (
                                <details className="text-muted mt-1 text-[11px]">
                                  <summary className="cursor-pointer text-[10px] font-semibold transition select-none hover:text-amber-400">
                                    View Step Diagnostics
                                  </summary>
                                  <pre className="rounded.xl bg-background border-border/60 mt-1 overflow-x-auto border p-2 font-mono text-[10px] text-cyan-300">
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
              <div className="flex flex-1 flex-col gap-4">
                {/* File Metadata Header */}
                <div className="border-border flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    {getAssetIcon(selectedAssetKey, activeAssetInfo.mimeType)}
                    <div>
                      <h3 className="text-foreground text-sm font-bold">
                        {activeAssetInfo.filename || selectedAssetKey}
                      </h3>
                      <p className="text-muted font-mono text-[10px]">
                        Key: '{selectedAssetKey}' • Mime:{" "}
                        {activeAssetInfo.mimeType || "unknown"} • Size:{" "}
                        {formatBytes(
                          activeAssetInfo.length || activeAssetInfo.size || 0,
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="text-primary-text bg-primary/10 border-primary-border/25 rounded-lg border px-2.5 py-1 font-mono text-xs">
                    Payload Offset: {activeAssetInfo.offset} B
                  </span>
                </div>

                {/* Live File Previewer */}
                <div className="bg-background border-border relative flex min-h-[350px] flex-1 items-center justify-center overflow-hidden rounded-xl border p-4">
                  {selectedAssetKey === "video" ? (
                    <video
                      controls
                      src={`adaumc://${video.id}/video`}
                      className="max-h-[420px] max-w-full rounded-lg shadow-xl"
                    />
                  ) : selectedAssetKey === "gif" ||
                    selectedAssetKey === "thumbnail" ||
                    selectedAssetKey.includes("sprite") ? (
                    <img
                      src={`adaumc://${video.id}/${selectedAssetKey}`}
                      alt={selectedAssetKey}
                      className="max-h-[420px] max-w-full rounded-lg border border-slate-800 object-contain shadow-xl"
                    />
                  ) : assetContent?.text ? (
                    <div className="h-full max-h-[420px] w-full overflow-y-auto bg-slate-950 p-4 text-left font-mono text-xs text-amber-300">
                      <pre className="whitespace-pre-wrap">
                        {assetContent.text}
                      </pre>
                    </div>
                  ) : (
                    <div className="font-mono text-xs text-slate-500">
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
              <div className="flex h-full flex-col items-center justify-center text-slate-500">
                <Code className="mb-2 h-8 w-8 text-slate-600" />
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
