import { describe, it, expect } from "bun:test";
import { VideoImportQueue } from "../src/main/random_video";

describe("VideoImportQueue Concurrency & Stability", () => {
  it("should process up to maxConcurrency tasks simultaneously and queue subsequent tasks", async () => {
    const queue = new VideoImportQueue(2);
    let activeRunning = 0;
    let maxObservedActive = 0;
    const completed: number[] = [];

    const simulateTask = async (id: number, durationMs: number) => {
      await queue.acquire(`task_${id}`);
      try {
        activeRunning++;
        if (activeRunning > maxObservedActive) {
          maxObservedActive = activeRunning;
        }
        await new Promise((r) => setTimeout(r, durationMs));
        completed.push(id);
      } finally {
        activeRunning--;
        queue.release();
      }
    };

    // Launch 10 simulated video imports
    const promises = Array.from({ length: 10 }, (_, i) => simulateTask(i, 20));
    await Promise.all(promises);

    expect(maxObservedActive).toBe(2);
    expect(completed.length).toBe(10);
  });

  it("should accurately report queue position and cancel tasks while in queue", async () => {
    const queue = new VideoImportQueue(1);
    const positions: number[] = [];

    await queue.acquire("running_1"); // occupies slot

    let task2Error: any = null;
    const task2Promise = queue
      .acquire("task_2", (pos) => positions.push(pos))
      .catch((err) => {
        task2Error = err;
      });

    expect(positions).toEqual([1]);
    expect(queue.getQueuePosition("task_2")).toBe(1);

    // Cancel task_2 while in queue
    queue.cancel("task_2");
    await task2Promise;

    expect(task2Error).toBeDefined();
    expect(task2Error.message).toContain("cancelled while in queue");

    // Release first task
    queue.release();
  });
});
