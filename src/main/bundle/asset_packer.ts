import fs from "fs";
import path from "path";
import { BuildAdaumcInput, AdaumcAssetInfo, AdaumcMetadata } from "./types";
import { ADAUMC_MAGIC, HEADER_OFFSET } from "./constants";
import { CipherTransform } from "./cipher_transform";
import { applyStreamCipher } from "../native_cipher";

export class AssetPacker {
  public static async packBundle(input: BuildAdaumcInput): Promise<string> {
    const indexTable: Record<string, AdaumcAssetInfo> = {};
    const filePayloads: {
      key: string;
      filePath: string;
      size: number;
      mimeType: string;
    }[] = [];
    let currentOffset = 0;

    for (const asset of input.assets) {
      if (fs.existsSync(asset.filePath)) {
        const stat = fs.statSync(asset.filePath);
        const filename = path.basename(asset.filePath);

        indexTable[asset.key] = {
          offset: currentOffset,
          length: stat.size,
          filename,
          mimeType: asset.mimeType,
        };

        currentOffset += stat.size;
        filePayloads.push({
          key: asset.key,
          filePath: asset.filePath,
          size: stat.size,
          mimeType: asset.mimeType,
        });
      }
    }

    const metadata: AdaumcMetadata = {
      id: input.id,
      title: input.title,
      duration: input.duration,
      resolution: input.resolution,
      tags: input.tags,
      createdAt: new Date().toISOString(),
      assets: indexTable,
      logs: input.logs || [
        `[${new Date().toISOString()}] .adaumc container built successfully.`,
      ],
    };

    const targetLength = HEADER_OFFSET - 10;
    let jsonStr = JSON.stringify(metadata);
    if (jsonStr.length < targetLength) {
      jsonStr = jsonStr.padEnd(targetLength, " ");
    } else {
      jsonStr = jsonStr.substring(0, targetLength);
    }

    const jsonBuf = Buffer.from(jsonStr, "utf-8");
    const encryptedIndex = applyStreamCipher(jsonBuf, 0);
    const indexLength = encryptedIndex.length;

    const writeStream = fs.createWriteStream(input.outputPath, {
      highWaterMark: 1024 * 1024,
    });
    writeStream.write(ADAUMC_MAGIC);

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(indexLength, 0);
    writeStream.write(lenBuf);
    writeStream.write(encryptedIndex);

    let fileOffset = 0;
    const totalBytes = Math.max(1, currentOffset);

    for (const payload of filePayloads) {
      if (input.onProgress) {
        input.onProgress(
          fileOffset,
          totalBytes,
          `Packing asset '${payload.key}' (${(payload.size / (1024 * 1024)).toFixed(2)} MB)...`,
        );
      }

      let lastProgressTime = 0;

      await new Promise<void>((resolve, reject) => {
        const readStream = fs.createReadStream(payload.filePath, {
          highWaterMark: 1024 * 1024,
        });
        const cipher = new CipherTransform(fileOffset);

        cipher.on("data", (chunk: Buffer) => {
          fileOffset += chunk.length;

          const now = Date.now();
          if (now - lastProgressTime > 150) {
            lastProgressTime = now;
            if (input.onProgress) {
              input.onProgress(
                fileOffset,
                totalBytes,
                `Packing asset '${payload.key}' (${(fileOffset / (1024 * 1024)).toFixed(1)} / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB)...`,
              );
            }
          }
        });

        readStream.on("error", reject);
        cipher.on("error", reject);
        writeStream.on("error", reject);

        cipher.pipe(writeStream, { end: false });
        readStream.pipe(cipher);

        cipher.on("end", () => {
          resolve();
        });
      });

      await new Promise((r) => setImmediate(r));
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      writeStream.end();
    });

    if (input.onProgress) {
      input.onProgress(
        totalBytes,
        totalBytes,
        `.adaumc container file created successfully at ${input.outputPath}`,
      );
    }

    return input.outputPath;
  }
}
