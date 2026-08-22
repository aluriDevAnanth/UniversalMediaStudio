import fs from "fs";
import path from "path";
import { Transform } from "stream";
import { makeLog } from "./ffmpeg_worker";

const MASK_KEY = Buffer.from("AdaumcSecretKey2026!");
export const HEADER_OFFSET = 16384; // 16KB placeholder header

class CipherTransform extends Transform {
  private offset: number;
  constructor(startOffset: number) {
    super();
    this.offset = startOffset;
  }
  _transform(chunk: Buffer, _encoding: string, callback: Function) {
    const result = Buffer.allocUnsafe(chunk.length);
    const keyLen = MASK_KEY.length;
    let keyIdx = this.offset % keyLen;
    for (let i = 0; i < chunk.length; i++) {
      result[i] = chunk[i] ^ MASK_KEY[keyIdx];
      keyIdx++;
      if (keyIdx === keyLen) keyIdx = 0;
    }
    this.offset += chunk.length;
    this.push(result);
    callback();
  }
}

export class ConcurrentPacker {
  private writeStream: fs.WriteStream;
  private videoPromise!: Promise<number>; // resolves with video size
  private outputPath: string;

  constructor(outputPath: string) {
    this.outputPath = outputPath;
    // 1. Initialize container with MAGIC and 16KB placeholder header
    this.writeStream = fs.createWriteStream(outputPath, { highWaterMark: 1024 * 1024 });
    this.writeStream.write(Buffer.from([0x41, 0x44, 0x41, 0x55, 0x4d, 0x43])); // 'ADAUMC'

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(HEADER_OFFSET - 10, 0); // index length placeholder
    this.writeStream.write(lenBuf);

    // Write remainder of the 16KB placeholder
    const placeholder = Buffer.alloc(HEADER_OFFSET - 10);
    this.writeStream.write(placeholder);
  }

  /**
   * Start background piping & encryption of the video file
   */
  public startPackingVideo(videoPath: string): void {
    this.videoPromise = new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(videoPath, { highWaterMark: 1024 * 1024 });
      const cipher = new CipherTransform(0);

      readStream.on("error", reject);
      cipher.on("error", reject);
      this.writeStream.on("error", reject);

      cipher.on("end", () => {
        const stat = fs.statSync(videoPath);
        resolve(stat.size);
      });

      // Write directly to our open bundle file
      cipher.pipe(this.writeStream, { end: false });
      readStream.pipe(cipher);
    });
  }

  /**
   * Finalize the bundle: append preview assets, construct metadata, and overwrite index header
   */
  public async finalizeBundle(
    id: string,
    title: string,
    duration: number,
    resolution: string,
    tags: string[],
    logs: string[],
    assets: { key: string; filePath: string; mimeType: string }[],
  ): Promise<void> {
    // 1. Wait for background video streaming to finish
    const videoSize = await this.videoPromise;

    logs.push(
      makeLog({
        level: "debug",
        event: "checkpoint",
        step: 4,
        stepName: "Bundle Pack",
        msg: `Primary video stream encryption finished: ${videoSize} bytes`,
        details: { videoSizeBytes: videoSize },
      }),
    );

    // 2. Append other generated assets to the end of the file
    const indexTable: Record<string, any> = {
      video: {
        offset: 0,
        length: videoSize,
        filename: "video.mp4",
        mimeType: "video/mp4",
      },
    };

    let currentOffset = videoSize;

    for (const asset of assets) {
      if (fs.existsSync(asset.filePath)) {
        const stat = fs.statSync(asset.filePath);
        const filename = path.basename(asset.filePath);

        indexTable[asset.key] = {
          offset: currentOffset,
          length: stat.size,
          filename,
          mimeType: asset.mimeType,
        };

        logs.push(
          makeLog({
            level: "debug",
            event: "checkpoint",
            step: 4,
            stepName: "Bundle Pack",
            msg: `Appended encrypted asset '${asset.key}' (${stat.size} bytes) at offset ${currentOffset}`,
            details: { key: asset.key, filename, offset: currentOffset, sizeBytes: stat.size },
          }),
        );

        // Append asset payload synchronously
        const data = fs.readFileSync(asset.filePath);

        // XOR encrypt preview assets starting at offset
        const keyLen = MASK_KEY.length;
        let keyIdx = currentOffset % keyLen;
        const masked = Buffer.allocUnsafe(data.length);
        for (let i = 0; i < data.length; i++) {
          masked[i] = data[i] ^ MASK_KEY[keyIdx];
          keyIdx++;
          if (keyIdx === keyLen) keyIdx = 0;
        }

        this.writeStream.write(masked);
        currentOffset += stat.size;
      }
    }

    // Close the stream
    await new Promise<void>((r) => this.writeStream.end(r));

    let finalBundleSize = 0;
    try {
      if (fs.existsSync(this.outputPath)) {
        finalBundleSize = fs.statSync(this.outputPath).size;
      }
    } catch (e) {}

    logs.push(
      makeLog({
        event: "checkpoint",
        step: 4,
        stepName: "Bundle Pack",
        msg: `Container assets payload assembly finished. Total size: ${finalBundleSize} bytes`,
        details: { totalSizeBytes: finalBundleSize, assetCount: Object.keys(indexTable).length },
      }),
    );

    // 3. Write final metadata index back to the beginning of the file (offset 10)
    const targetLength = HEADER_OFFSET - 10;
    let headerLogs = [...logs];
    const metadata = {
      id,
      title,
      duration,
      resolution,
      tags,
      createdAt: new Date().toISOString(),
      assets: indexTable,
      logs: headerLogs,
    };

    let jsonStr = JSON.stringify(metadata);

    // If jsonStr exceeds header placeholder size (16374 bytes), prune middle log lines until it fits
    while (jsonStr.length > targetLength && headerLogs.length > 0) {
      if (headerLogs.length > 10) {
        headerLogs.splice(Math.floor(headerLogs.length / 2), 1);
      } else {
        headerLogs.pop();
      }
      metadata.logs = headerLogs;
      jsonStr = JSON.stringify(metadata);
    }

    if (jsonStr.length > targetLength) {
      metadata.logs = [
        makeLog({
          level: "info",
          event: "info",
          step: 0,
          stepName: "Init",
          msg: "Header logs summary truncated. Complete telemetry logs stored in container_telemetry.ndjson asset.",
        }),
      ];
      jsonStr = JSON.stringify(metadata);
    }

    const paddedJsonStr = jsonStr.padEnd(targetLength, " ").slice(0, targetLength);
    const jsonBuf = Buffer.from(paddedJsonStr, "utf-8");

    // Encrypt header index
    const keyLen = MASK_KEY.length;
    const encryptedIndex = Buffer.allocUnsafe(targetLength);
    for (let i = 0; i < targetLength; i++) {
      encryptedIndex[i] = jsonBuf[i] ^ MASK_KEY[i % keyLen];
    }

    // Open file for random access writing and overwrite header index
    const fd = fs.openSync(this.outputPath, "r+");

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(targetLength, 0);
    fs.writeSync(fd, lenBuf, 0, 4, 6); // Overwrite index length at offset 6 (exactly targetLength)
    fs.writeSync(fd, encryptedIndex, 0, targetLength, 10); // Overwrite index at offset 10 (exactly targetLength)
    fs.closeSync(fd);
  }

  public abort(): void {
    try {
      this.writeStream.destroy();
    } catch (e) {}
  }
}
