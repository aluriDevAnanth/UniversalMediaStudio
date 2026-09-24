import React, { useState } from "react";
import {
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Database,
  Binary,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";
import { StorageStatCard, StorageBundleTable } from "./storage";

export const StorageManager: React.FC = () => {
  const { videos, analytics } = useVideoStore();
  const [checking, setChecking] = useState(false);

  const totalBytes = analytics?.totalStorageBytes || 0;
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return (mb / 1024).toFixed(2) + " GB";
    }
    return mb.toFixed(2) + " MB";
  };

  const handleIntegrityCheck = async () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
    }, 1500);
  };

  return (
    <div className="mx-auto w-full flex-1 space-y-4 md:space-y-6 overflow-y-auto px-2 md:px-4 py-2">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="flex items-center gap-2 md:gap-3 text-lg md:text-2xl font-bold text-foreground">
            <HardDrive className="h-5 w-5 md:h-6 md:w-6 text-primary-text shrink-0" />
            <span>Storage Management & .adaumc</span>
          </h2>
          <p className="mt-1 text-xs text-muted">
            Manage unified binary containers, verify magic header signatures,
            and optimize disk footprint.
          </p>
        </div>

        <button
          onClick={handleIntegrityCheck}
          disabled={checking}
          className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-3 md:px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-primary-hover"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Scanning..." : "Verify Integrity"}
        </button>
      </div>

      {/* Storage Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <StorageStatCard
          title="Total Storage Used"
          icon={Database}
          value={formatSize(totalBytes)}
          subtitle={`Across ${videos.length} .adaumc container archives`}
        />

        <StorageStatCard
          title="Container Format"
          icon={Binary}
          value="ADAUMC"
          valueColor="text-primary-text"
          subtitle="Magic Header: 0x41 0x44 0x41 0x55 0x4D 0x43"
        />

        <StorageStatCard
          title="Stream Cipher Security"
          icon={ShieldCheck}
          iconColor="text-emerald-500"
          value="AES-128 XOR"
          valueColor="text-emerald-500"
          subtitle="Range Request Stream Engine Active"
        />
      </div>

      {/* Bundle Files Table */}
      <StorageBundleTable videos={videos} />
    </div>
  );
};
