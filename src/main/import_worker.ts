import { parentPort, workerData } from "worker_threads";
import fs from "fs";
import path from "path";
import { applyStreamCipherInPlace } from "./native_cipher";

export interface ImportWorkerData {
  filePath: string;
  outputPath: string;
  videoId: string;
  title: string;
  duration: number;
  resolution: string;
  tags?: string[];
  thumbnailPath?: string;
  logs?: string[];
}

async function processVideo(data: ImportWorkerData) {
  const { filePath, outputPath, videoId, title, duration, resolution, tags, thumbnailPath, logs } = data;
  const stat = fs.statSync(filePath);

  const readFd = fs.openSync(filePath, "r");
  const writeFd = fs.openSync(outputPath, "w");

  try {
    // Step 1: Pre-allocate 16KB Header Placeholder
    const headerBuf = Buffer.alloc(16384);
    headerBuf.write("ADAUMC", 0, 6, "ascii");
    headerBuf.writeUInt32BE(16374, 6);
    fs.writeSync(writeFd, headerBuf, 0, 16384, 0);

    // Step 2: Stream Video Payload via 1MB Buffers & SIMD XOR
    const CHUNK_SIZE = 1024 * 1024; // 1MB buffer optimization
    const buffer = Buffer.allocUnsafe(CHUNK_SIZE);
    let bytesRead = 0;
    let currentOffset = 0;

    while ((bytesRead = fs.readSync(readFd, buffer, 0, CHUNK_SIZE, null)) > 0) {
      const chunkToProcess = buffer.subarray(0, bytesRead);
      applyStreamCipherInPlace(chunkToProcess, currentOffset);
      fs.writeSync(writeFd, chunkToProcess, 0, bytesRead, 16384 + currentOffset);
      currentOffset += bytesRead;
    }

    // Step 3: Append thumbnail if present
    let indexTable: Record<string, any> = {
      video: { offset: 0, length: stat.size, filename: path.basename(filePath), mimeType: "video/mp4" },
    };

    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
      const thumbStat = fs.statSync(thumbnailPath);
      const thumbData = fs.readFileSync(thumbnailPath);
      applyStreamCipherInPlace(thumbData, currentOffset);
      fs.writeSync(writeFd, thumbData, 0, thumbStat.size, 16384 + currentOffset);

      indexTable["thumbnail"] = {
        offset: currentOffset,
        length: thumbStat.size,
        filename: path.basename(thumbnailPath),
        mimeType: "image/jpeg",
      };
      currentOffset += thumbStat.size;
    }

    // Step 4: Fast Header Overwrite
    const metadata = {
      id: videoId,
      title: title || path.basename(filePath, path.extname(filePath)),
      duration: duration || 60,
      resolution: resolution || "1920x1080",
      tags: tags || [],
      createdAt: new Date().toISOString(),
      assets: indexTable,
      logs: logs || [],
    };

    let jsonStr = JSON.stringify(metadata).padEnd(16374, " ").slice(0, 16374);
    const encryptedHeader = Buffer.from(jsonStr, "utf-8");
    applyStreamCipherInPlace(encryptedHeader, 0);

    fs.writeSync(writeFd, encryptedHeader, 0, encryptedHeader.length, 10);
  } finally {
    fs.closeSync(readFd);
    fs.closeSync(writeFd);
  }

  if (parentPort) {
    parentPort.postMessage({ status: "DONE", containerPath: outputPath, videoId });
  }
}

if (workerData) {
  processVideo(workerData).catch((err) => {
    if (parentPort) {
      parentPort.postMessage({ status: "ERROR", error: err?.message });
    }
  });
}
