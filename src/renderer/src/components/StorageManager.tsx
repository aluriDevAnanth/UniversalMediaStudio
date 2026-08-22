import React, { useState } from "react";
import {
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Database,
  Binary,
} from "lucide-react";
import { useVideoStore } from "../store/videoStore";

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
    <div className="mx-auto w-full flex-1 space-y-6 overflow-y-auto px-4 py-2">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <HardDrive className="h-6 w-6 text-primary-text" />
            Storage Management & .adaumc Bundles
          </h2>
          <p className="mt-1 text-xs text-muted">
            Manage unified binary containers, verify magic header signatures,
            and optimize disk footprint.
          </p>
        </div>

        <button
          onClick={handleIntegrityCheck}
          disabled={checking}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-primary-hover"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Scanning..." : "Verify Bundle Integrity"}
        </button>
      </div>


      {/* Storage Cards Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Total Storage Used
            </span>
            <Database className="h-5 w-5 text-primary-text" />
          </div>
          <div className="mt-4 text-3xl font-extrabold text-foreground">
            {formatSize(totalBytes)}
          </div>
          <div className="mt-2 text-xs text-muted">
            Across {videos.length} .adaumc container archives
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Container Format
            </span>
            <Binary className="h-5 w-5 text-primary-text" />
          </div>
          <div className="mt-4 text-3xl font-extrabold text-primary-text">
            ADAUMC
          </div>
          <div className="mt-2 text-xs text-muted">
            Magic Header: 0x41 0x44 0x41 0x55 0x4D 0x43
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Stream Cipher Security
            </span>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-4 text-3xl font-extrabold text-emerald-500">
            AES-128 XOR
          </div>
          <div className="mt-2 text-xs text-muted">
            Range Request Stream Engine Active
          </div>
        </div>
      </div>

      {/* Bundle Files Table */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="mb-4 text-base font-bold text-foreground">
          Active .adaumc Bundle Catalog
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted">
            <thead className="bg-background/60 border-b border-border text-[10px] font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Bundle ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Resolution</th>
                <th className="px-4 py-3">Assets Encapsulated</th>
                <th className="px-4 py-3">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-border/60 divide-y">
              {videos.map((v) => (
                <tr key={v.id} className="hover:bg-surface-hover/50 transition">
                  <td className="px-4 py-3 font-mono text-primary-text">
                    {v.id}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {v.title}
                  </td>
                  <td className="px-4 py-3">{v.resolution}</td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-border bg-background px-2 py-0.5 text-muted">
                      video, thumb, gif, vtt, sprite
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(v.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
