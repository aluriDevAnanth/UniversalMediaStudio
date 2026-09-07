export {
  FFmpegProcessor,
  activeChildProcesses,
  registerChildProcess,
  killActiveChildProcesses,
  GLOBAL_FFMPEG_SEMAPHORE,
  ImportSemaphore,
  makeLog,
} from "./ffmpeg_worker";

export type {
  ProcessMediaResult,
  SpriteProgressUpdate,
  LogEntry,
} from "./ffmpeg_worker";
