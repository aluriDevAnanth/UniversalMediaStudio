import React from "react";
import { Terminal } from "lucide-react";
import { BufferHealthStats } from "../../utils/bufferMonitor";

export interface PlayerTelemetryLogsProps {
  showLogs: boolean;
  loadingLogs: boolean;
  parsedLogs: any[];
  bufferStats: BufferHealthStats;
  videoId: string;
}

export const PlayerTelemetryLogs: React.FC<PlayerTelemetryLogsProps> = ({
  showLogs,
  loadingLogs,
  parsedLogs,
  bufferStats,
  videoId,
}) => {
  if (!showLogs) return null;

  return (
    <div className="bg-background border-border text-primary-text mt-4 max-h-64 space-y-2 overflow-y-auto rounded-xl border p-4 font-mono text-xs">
      <div className="text-muted border-border mb-2 flex items-center justify-between border-b pb-2">
        <span className="text-foreground flex items-center gap-1.5 font-bold">
          <Terminal className="h-4 w-4 text-amber-500" />
          .adaumc Container Diagnostic Telemetry Logs
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-muted">
            Buffer:{" "}
            <strong
              className={
                bufferStats.health === "excellent" || bufferStats.health === "good"
                  ? "text-emerald-400"
                  : bufferStats.health === "fair"
                    ? "text-amber-400"
                    : "text-red-400"
              }
            >
              {bufferStats.bufferAheadSec}s ({bufferStats.health.toUpperCase()})
            </strong>
          </span>
          <span className="text-muted">
            Bandwidth: <strong className="text-cyan-400">{bufferStats.estimatedMbps} Mbps</strong>
          </span>
          {bufferStats.stalls > 0 && (
            <span className="text-red-400">
              Stalls: <strong>{bufferStats.stalls}</strong>
            </span>
          )}
          <span className="text-muted">ID: {videoId}</span>
        </div>
      </div>
      {loadingLogs ? (
        <p className="text-muted">Loading telemetry logs...</p>
      ) : parsedLogs.length === 0 ? (
        <p className="text-muted">No telemetry logs found.</p>
      ) : (
        parsedLogs.map((log: any, index: number) => {
          const timeStr = log.t
            ? new Date(log.t).toLocaleTimeString()
            : "";
          const level =
            log.level ||
            (log.event === "error"
              ? "error"
              : log.event === "warn"
                ? "warn"
                : "info");

          let badgeBg =
            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
          if (level === "error")
            badgeBg = "bg-red-500/10 text-red-400 border-red-500/20";
          else if (level === "warn")
            badgeBg =
              "bg-amber-500/10 text-amber-400 border-amber-500/20";
          else if (level === "debug")
            badgeBg = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

          let text = "";
          if (log.event === "step_start") {
            text = `▶ Step ${log.step} [${log.stepName}] started${log.msg ? ` - ${log.msg}` : ""}`;
          } else if (log.event === "step_end") {
            text = `⏹ Step ${log.step} [${log.stepName}] completed in ${log.durationMs || 0}ms`;
          } else if (log.event === "unit_start") {
            text = `↳ Starting ${log.unitName || `Unit ${log.unitIndex}`}${log.msg ? ` - ${log.msg}` : ""}`;
          } else if (log.event === "unit_end") {
            text = `↳ Completed ${log.unitName || `Unit ${log.unitIndex}`} in ${log.durationMs || 0}ms`;
          } else if (log.event === "cmd_exec") {
            text = `⚡ CLI Exec: ${log.msg || ""}`;
          } else {
            text = log.msg || "";
          }

          return (
            <div
              key={index}
              className={`bg-surface/50 border-border/40 flex flex-col gap-1 rounded border p-1.5 ${
                log.event?.startsWith("unit_") ? "pl-4" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-foreground flex flex-wrap items-center gap-2">
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
                  {log.stepName && (
                    <span className="bg-border/50 text-muted rounded px-1.5 py-0.5 text-[9px]">
                      {log.stepName}
                    </span>
                  )}
                  <span>{text}</span>
                </div>
                {log.memoryMb && (
                  <span className="text-muted text-[10px] whitespace-nowrap">
                    {log.memoryMb}MB RAM
                  </span>
                )}
              </div>

              {log.details && Object.keys(log.details).length > 0 && (
                <details className="text-muted mt-1 text-[11px]">
                  <summary className="cursor-pointer text-[10px] font-semibold transition select-none hover:text-amber-400">
                    View Diagnostic Details
                  </summary>
                  <pre className="bg-background border-border/60 mt-1 overflow-x-auto rounded border p-2 font-mono text-[10px] text-cyan-300">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
