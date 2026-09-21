export interface ProgressUpdate {
  taskId: string;
  fileName: string;
  step: number;
  totalSteps: number;
  percent: number;
  workDone?: number;
  totalWork?: number;
  log?: string;
  etaSeconds: number | null;
}

export type ImportProgress = ProgressUpdate;
