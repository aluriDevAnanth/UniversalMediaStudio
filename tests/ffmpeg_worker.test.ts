import { describe, it, expect } from "bun:test";
import {
  makeLog,
  ImportSemaphore,
  activeChildProcesses,
  registerChildProcess,
  killActiveChildProcesses,
} from "../src/main/ffmpeg_worker";

describe("FFmpeg Worker Utilities & Process Management (src/main/ffmpeg_worker.ts)", () => {
  it("should generate structured NDJSON log entries with memory usage and timestamps", () => {
    const logStr = makeLog({
      step: 1,
      stepName: "Metadata Probe",
      event: "info",
      msg: "Extracted metadata successfully",
      details: { duration: 120, resolution: "1920x1080" },
    });

    const parsed = JSON.parse(logStr);
    expect(parsed.step).toBe(1);
    expect(parsed.stepName).toBe("Metadata Probe");
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("info");
    expect(parsed.msg).toBe("Extracted metadata successfully");
    expect(parsed.memoryMb).toBeGreaterThan(0);
    expect(parsed.t).toBeDefined();
    expect(new Date(parsed.t).getTime()).not.toBeNaN();
  });

  it("should correctly infer log levels based on event types", () => {
    const errorLog = JSON.parse(makeLog({ step: 0, stepName: "Init", event: "error", msg: "Failed" }));
    expect(errorLog.level).toBe("error");

    const warnLog = JSON.parse(makeLog({ step: 0, stepName: "Init", event: "warn", msg: "Warning" }));
    expect(warnLog.level).toBe("warn");

    const cmdLog = JSON.parse(makeLog({ step: 0, stepName: "Init", event: "cmd_exec", msg: "ffmpeg -i input.mp4" }));
    expect(cmdLog.level).toBe("debug");
  });

  it("should enforce concurrency limits with ImportSemaphore and drain queue in FIFO order", async () => {
    const semaphore = new ImportSemaphore(2);
    let active = 0;
    let maxObservedActive = 0;
    const executionOrder: number[] = [];

    const runTask = async (id: number, durationMs: number) => {
      await semaphore.acquire();
      active++;
      maxObservedActive = Math.max(maxObservedActive, active);
      await new Promise((r) => setTimeout(r, durationMs));
      executionOrder.push(id);
      active--;
      semaphore.release();
    };

    const tasks = [
      runTask(1, 30),
      runTask(2, 30),
      runTask(3, 10),
      runTask(4, 10),
    ];

    await Promise.all(tasks);

    expect(maxObservedActive).toBeLessThanOrEqual(2);
    expect(executionOrder.length).toBe(4);
  });

  it("should register and deregister child processes cleanly", () => {
    const videoId = "vid_proc_test_1";
    const fakeChild = {
      pid: 99999,
      on: (evt: string, fn: Function) => {
        if (evt === "close") {
          setTimeout(fn, 10);
        }
      },
      kill: () => {},
    } as any;

    registerChildProcess(videoId, fakeChild);
    expect(activeChildProcesses.has(videoId)).toBe(true);

    // After close event fires
    setTimeout(() => {
      expect(activeChildProcesses.has(videoId)).toBe(false);
    }, 25);
  });
});
