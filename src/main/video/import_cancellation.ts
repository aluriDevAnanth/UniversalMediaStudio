import { FFmpegProcessor } from "../ffmpeg_processor";
import { GLOBAL_VIDEO_IMPORT_QUEUE } from "./import_queue";

export const activeImportTasks = new Map<string, { videoId: string; isCancelled: boolean }>();
export const activeImportFilePaths = new Set<string>();

export function cancelActiveImport(taskId?: string): void {
  if (taskId) {
    GLOBAL_VIDEO_IMPORT_QUEUE.cancel(taskId);
    const task = activeImportTasks.get(taskId);
    if (task) {
      task.isCancelled = true;
      FFmpegProcessor.killActiveChildProcesses(taskId);
      console.log(`[Import] Cancelled active import task and killed processes for taskId: ${taskId}`);
    }
  } else {
    for (const [id, task] of activeImportTasks.entries()) {
      GLOBAL_VIDEO_IMPORT_QUEUE.cancel(id);
      task.isCancelled = true;
      FFmpegProcessor.killActiveChildProcesses(id);
      console.log(`[Import] Cancelled active import task and killed processes for taskId: ${id}`);
    }
  }
}
