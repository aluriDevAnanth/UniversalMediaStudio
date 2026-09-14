export interface AdaumcAssetInfo {
  offset: number;
  length: number;
  filename?: string;
  mimeType?: string;
  size?: number;
  label?: string;
  lang?: string;
}

export interface AdaumcMetadata {
  id: string;
  title: string;
  duration: number;
  resolution: string;
  tags: string[];
  createdAt: string;
  assets: Record<string, AdaumcAssetInfo>;
  logs: string[];
}

export interface BuildAdaumcInput {
  id: string;
  title: string;
  duration: number;
  resolution: string;
  tags: string[];
  logs?: string[];
  assets: {
    key: string;
    filePath: string;
    mimeType: string;
  }[];
  outputPath: string;
  onProgress?: (written: number, total: number, log?: string) => void;
}
