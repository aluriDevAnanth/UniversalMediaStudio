import React from "react";
import { Code, Video as VideoIcon, Image as ImageIcon, FileCode, FileText } from "lucide-react";

export interface BundleAssetPreviewProps {
  videoId: string;
  selectedAssetKey: string;
  activeAssetInfo: any;
  assetContent: {
    mimeType: string;
    totalSize: number;
    text: string;
    base64: string;
  } | null;
}

export const BundleAssetPreview: React.FC<BundleAssetPreviewProps> = ({
  videoId,
  selectedAssetKey,
  activeAssetInfo,
  assetContent,
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

  if (!activeAssetInfo) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <Code className="mb-2 h-8 w-8 text-slate-600" />
        <p className="text-xs">
          Select a file from the bundle index directory on the left to inspect.
        </p>
      </div>
    );
  }

  return (
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
            src={`adaumc://${videoId}/video`}
            className="max-h-[420px] max-w-full rounded-lg shadow-xl"
          />
        ) : selectedAssetKey === "gif" ||
          selectedAssetKey === "thumbnail" ||
          selectedAssetKey.includes("sprite") ? (
          <img
            src={`adaumc://${videoId}/${selectedAssetKey}`}
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
  );
};
