import { describe, it, expect } from "bun:test";
import { BufferHealthMonitor } from "../src/renderer/src/utils/bufferMonitor";

// Mock helper to create HTMLVideoElement mock
function createMockVideo(currentTime = 0, bufferedRanges: [number, number][] = []) {
  const listeners: Record<string, Function[]> = {};

  const timeRanges = {
    length: bufferedRanges.length,
    start: (index: number) => bufferedRanges[index][0],
    end: (index: number) => bufferedRanges[index][1],
  };

  return {
    currentTime,
    buffered: timeRanges,
    addEventListener: (evt: string, fn: Function) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    removeEventListener: (evt: string, fn: Function) => {
      if (listeners[evt]) {
        listeners[evt] = listeners[evt].filter((cb) => cb !== fn);
      }
    },
    trigger: (evt: string) => {
      (listeners[evt] || []).forEach((fn) => fn());
    },
  } as any;
}

describe("Buffer & Playback Health Monitor (src/renderer/src/utils/bufferMonitor.ts)", () => {
  it("should return poor health defaults when video element is not attached", () => {
    const monitor = new BufferHealthMonitor();
    const stats = monitor.getStats();

    expect(stats.bufferAheadSec).toBe(0);
    expect(stats.bufferPercent).toBe(0);
    expect(stats.health).toBe("poor");
    expect(stats.stalls).toBe(0);
    expect(stats.totalStallDurationMs).toBe(0);
  });

  it("should calculate health as 'excellent' when buffer ahead >= 15 seconds", () => {
    const monitor = new BufferHealthMonitor();
    const mockVideo = createMockVideo(10, [[0, 30]]); // currentTime=10, buffer ends at 30 -> bufferAhead=20s
    monitor.attach(mockVideo);

    const stats = monitor.getStats();
    expect(stats.bufferAheadSec).toBe(20);
    expect(stats.health).toBe("excellent");
    expect(stats.bufferPercent).toBe(67); // 20 / 30 * 100 = 67%
  });

  it("should calculate health as 'good' when buffer ahead is between 6 and 14 seconds", () => {
    const monitor = new BufferHealthMonitor();
    const mockVideo = createMockVideo(0, [[0, 10]]); // bufferAhead=10s
    monitor.attach(mockVideo);

    const stats = monitor.getStats();
    expect(stats.bufferAheadSec).toBe(10);
    expect(stats.health).toBe("good");
  });

  it("should calculate health as 'fair' when buffer ahead is between 2 and 5.9 seconds", () => {
    const monitor = new BufferHealthMonitor();
    const mockVideo = createMockVideo(5, [[0, 9]]); // bufferAhead=4s
    monitor.attach(mockVideo);

    const stats = monitor.getStats();
    expect(stats.bufferAheadSec).toBe(4);
    expect(stats.health).toBe("fair");
  });

  it("should calculate health as 'poor' when buffer ahead < 2 seconds", () => {
    const monitor = new BufferHealthMonitor();
    const mockVideo = createMockVideo(10, [[0, 11]]); // bufferAhead=1s
    monitor.attach(mockVideo);

    const stats = monitor.getStats();
    expect(stats.bufferAheadSec).toBe(1);
    expect(stats.health).toBe("poor");
  });

  it("should track playback stalls and cumulative stall durations on waiting/playing events", async () => {
    const monitor = new BufferHealthMonitor();
    const mockVideo = createMockVideo(0, [[0, 20]]);
    monitor.attach(mockVideo);

    // Initial state: 0 stalls
    expect(monitor.getStats().stalls).toBe(0);

    // Trigger waiting (stall start)
    mockVideo.trigger("waiting");
    expect(monitor.getStats().stalls).toBe(1);

    await new Promise((r) => setTimeout(r, 25));

    // Trigger playing (stall end)
    mockVideo.trigger("playing");
    expect(monitor.getStats().totalStallDurationMs).toBeGreaterThanOrEqual(20);

    // Trigger second stall
    mockVideo.trigger("waiting");
    expect(monitor.getStats().stalls).toBe(2);

    await new Promise((r) => setTimeout(r, 25));
    mockVideo.trigger("playing");
    expect(monitor.getStats().totalStallDurationMs).toBeGreaterThanOrEqual(40);
  });

  it("should cleanly detach event listeners when detach() is called", () => {
    const monitor = new BufferHealthMonitor();
    const mockVideo = createMockVideo(0, [[0, 30]]);
    monitor.attach(mockVideo);
    monitor.detach();

    // After detach, getStats should return detached default poor state
    const stats = monitor.getStats();
    expect(stats.bufferAheadSec).toBe(0);
    expect(stats.health).toBe("poor");
  });
});
