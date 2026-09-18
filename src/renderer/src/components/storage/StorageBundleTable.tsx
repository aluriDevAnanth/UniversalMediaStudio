import React from "react";
import { VideoRecord } from "../../env";

interface StorageBundleTableProps {
  videos: VideoRecord[];
}

export const StorageBundleTable: React.FC<StorageBundleTableProps> = ({ videos }) => {
  return (
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
  );
};
