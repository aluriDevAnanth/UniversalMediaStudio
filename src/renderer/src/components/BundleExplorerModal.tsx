import React, { useEffect, useState } from "react";
import { VideoRecord } from "../env";
import {
  BundleExplorerHeader,
  BundleSidebar,
  BundleTelemetryViewer,
  BundleAssetPreview,
} from "./bundle-explorer/index";

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

  const assetsMap =
    bundleData?.metadata?.assets || (bundleData as any)?.assets || {};
  const activeAssetInfo = assetsMap[selectedAssetKey];

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-2 sm:p-4 md:p-6 backdrop-blur-md">
      <div className="bg-surface border-border flex h-[90vh] max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl transition-colors duration-200">
        {/* Header */}
        <BundleExplorerHeader
          title={video.title}
          payloadStartOffset={bundleData?.payloadStartOffset || 10}
          onClose={onClose}
        />

        {/* File Explorer Split View */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Sidebar: Asset Directory */}
          <BundleSidebar
            assetsMap={assetsMap}
            selectedAssetKey={selectedAssetKey}
            loading={loading}
            error={bundleData?.error}
            onSelectAssetKey={setSelectedAssetKey}
          />

          {/* Right Main Panel: File Debugger & Previewer */}
          <div className="bg-surface-hover/30 flex flex-1 flex-col overflow-y-auto p-2">
            {selectedAssetKey === "logs" ? (
              <BundleTelemetryViewer
                logs={bundleData?.metadata?.logs || []}
                logFilter={logFilter}
                onSetLogFilter={setLogFilter}
              />
            ) : (
              <BundleAssetPreview
                videoId={video.id}
                selectedAssetKey={selectedAssetKey}
                activeAssetInfo={activeAssetInfo}
                assetContent={assetContent}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
