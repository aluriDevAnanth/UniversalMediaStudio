import React from "react";
import { Terminal } from "lucide-react";

export interface BundleTelemetryViewerProps {
  logs: string[];
  logFilter: "all" | "error" | "warn" | "info" | "debug";
  onSetLogFilter: (filter: "all" | "error" | "warn" | "info" | "debug") => void;
}

export const BundleTelemetryViewer: React.FC<BundleTelemetryViewerProps> = ({
  logs,
  logFilter,
  onSetLogFilter,
}) => {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="border-border mb-1 flex items-center justify-between border-b">
        <div className="text-foreground flex items-center gap-2 text-xs font-bold">
          <Terminal className="h-4 w-4 text-amber-500" />
          <span>Container Execution Telemetry Logs</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          {(["all", "error", "warn", "info", "debug"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onSetLogFilter(filter)}
              className={`rounded-md px-2 py-1 font-semibold capitalize transition ${
                logFilter === filter
                  ? "bg-amber-500 text-black shadow"
                  : "bg-surface border-border text-muted hover:text-foreground border"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-background border-border text-primary-text mb-2 flex-1 space-y-2 overflow-y-auto rounded-xl border p-2 font-mono text-xs">
        {logs
          .map((rawLog: string, idx: number) => {
            let parsed: any = null;
            try {
              parsed = JSON.parse(rawLog);
            } catch {
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
              badgeBg = "bg-red-500/10 text-red-400 border-red-500/20";
            else if (level === "warn")
              badgeBg = "bg-amber-500/10 text-amber-400 border-amber-500/20";
            else if (level === "debug")
              badgeBg = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

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

                  {parsed.details && Object.keys(parsed.details).length > 0 && (
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
  );
};
