import os from "os";

export class VideoImportQueue {
  private queue: {
    taskId: string;
    resolve: () => void;
    reject: (err: Error) => void;
    onPositionChange?: (pos: number) => void;
  }[] = [];
  private activeCount = 0;

  constructor(private limit: number) {}

  public async acquire(
    taskId: string,
    onPositionChange?: (pos: number) => void,
  ): Promise<void> {
    if (this.activeCount < this.limit) {
      this.activeCount++;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ taskId, resolve, reject, onPositionChange });
      if (onPositionChange) {
        onPositionChange(this.queue.length);
      }
    });
  }

  public release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.queue.forEach((item, index) => {
          if (item.onPositionChange) {
            item.onPositionChange(index + 1);
          }
        });
        next.resolve();
      }
    } else {
      this.activeCount = Math.max(0, this.activeCount - 1);
    }
  }

  public getQueuePosition(taskId: string): number {
    const idx = this.queue.findIndex((item) => item.taskId === taskId);
    return idx >= 0 ? idx + 1 : 0;
  }

  public cancel(taskId: string): void {
    const idx = this.queue.findIndex((item) => item.taskId === taskId);
    if (idx !== -1) {
      const [removed] = this.queue.splice(idx, 1);
      removed.reject(new Error("Import cancelled while in queue"));
    }
  }
}

const CPU_CORES = typeof os !== "undefined" && os.cpus ? os.cpus().length : 4;
export const GLOBAL_VIDEO_IMPORT_QUEUE = new VideoImportQueue(
  Math.min(8, Math.max(2, CPU_CORES - 1)),
);
