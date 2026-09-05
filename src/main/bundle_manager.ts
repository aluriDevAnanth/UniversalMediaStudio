import fs from "fs";
import path from "path";
import { Readable, Transform } from "stream";

export interface AdaumcAssetInfo {
  offset: number;
  length: number;
  filename?: string;
  mimeType?: string;
  size?: number;
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
    key: string; // e.g. 'video', 'thumbnail', 'gif', 'vtt', 'sprite_0'
    filePath: string;
    mimeType: string;
  }[];
  outputPath: string;
  onProgress?: (written: number, total: number, log?: string) => void;
}

export const ADAUMC_MAGIC = Buffer.from([0x41, 0x44, 0x41, 0x55, 0x4d, 0x43]); // 'ADAUMC' (6 Bytes)
const MASK_KEY = Buffer.from("AdaumcSecretKey2026!"); // Stream cipher XOR key

class CipherTransform extends Transform {
  private offset: number;
  constructor(startOffset: number) {
    super();
    this.offset = startOffset;
  }
  _transform(chunk: Buffer, _encoding: string, callback: Function) {
    const masked = BundleManager.applyStreamCipherMask(chunk, this.offset);
    this.offset += chunk.length;
    this.push(masked);
    callback();
  }
}

export class BundleManager {
  /**
   * Stream cipher XOR mask function (optimized with loop unrolling)
   */
  public static applyStreamCipherMask(
    data: Buffer,
    startOffset: number = 0,
  ): Buffer {
    const len = data.length;
    const result = Buffer.allocUnsafe(len);
    const keyLen = MASK_KEY.length;
    let keyIdx = startOffset % keyLen;

    let i = 0;
    const fastLimit = len - 4;
    while (i <= fastLimit) {
      result[i] = data[i] ^ MASK_KEY[keyIdx];
      result[i + 1] = data[i + 1] ^ MASK_KEY[(keyIdx + 1) % keyLen];
      result[i + 2] = data[i + 2] ^ MASK_KEY[(keyIdx + 2) % keyLen];
      result[i + 3] = data[i + 3] ^ MASK_KEY[(keyIdx + 3) % keyLen];
      keyIdx = (keyIdx + 4) % keyLen;
      i += 4;
    }

    while (i < len) {
      result[i] = data[i] ^ MASK_KEY[keyIdx];
      keyIdx = (keyIdx + 1) % keyLen;
      i++;
    }

    return result;
  }

  /**
   * Packs media files into single .adaumc container file (matching YTDLPY BundleManager.create_bundle)
   */
  public static async packBundle(input: BuildAdaumcInput): Promise<string> {
    const indexTable: Record<string, AdaumcAssetInfo> = {};
    const filePayloads: {
      key: string;
      filePath: string;
      size: number;
      mimeType: string;
    }[] = [];
    let currentOffset = 0;

    // Compute index offsets for each existing asset file
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

    const jsonStr = JSON.stringify(metadata);
    const jsonBuf = Buffer.from(jsonStr, "utf-8");
    const encryptedIndex = this.applyStreamCipherMask(jsonBuf, 0);
    const indexLength = encryptedIndex.length;

    // Write file: [MAGIC 6B] [INDEX_LEN 4B] [ENCRYPTED_INDEX] [STREAM_CIPHER_PAYLOADS...]
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

        cipher.on("data", (chunk: any) => {
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

      // Yield event loop between asset files
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

  private static metadataCache = new Map<
    string,
    { metadata: AdaumcMetadata; payloadStartOffset: number; mtimeMs: number }
  >();

  /**
   * Reads metadata header from an .adaumc file (supports both 10B YTDLPY and 11B early dev headers)
   */
  public static readMetadata(bundlePath: string): {
    metadata: AdaumcMetadata;
    payloadStartOffset: number;
  } {
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle file not found: ${bundlePath}`);
    }

    const stat = fs.statSync(bundlePath);
    const cached = this.metadataCache.get(bundlePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return { metadata: cached.metadata, payloadStartOffset: cached.payloadStartOffset };
    }

    const fd = fs.openSync(bundlePath, "r");
    try {
      const magicBuf = Buffer.alloc(6);
      fs.readSync(fd, magicBuf, 0, 6, 0);

      if (!magicBuf.equals(ADAUMC_MAGIC)) {
        throw new Error(
          `Invalid ADAUMC magic header! Expected 'ADAUMC', got '${magicBuf.toString()}'`,
        );
      }

      const checkBuf = Buffer.alloc(5);
      fs.readSync(fd, checkBuf, 0, 5, 6);

      let indexLen = 0;
      let jsonStartOffset = 10;

      // Support 11-byte header (0x01 version byte at offset 6) or 10-byte header (YTDLPY spec)
      if (checkBuf[0] === 0x01) {
        indexLen = checkBuf.readUInt32BE(1);
        jsonStartOffset = 11;
      } else {
        indexLen = checkBuf.readUInt32BE(0);
        jsonStartOffset = 10;
      }

      const encryptedIndex = Buffer.alloc(indexLen);
      fs.readSync(fd, encryptedIndex, 0, indexLen, jsonStartOffset);

      const decryptedJson = this.applyStreamCipherMask(encryptedIndex, 0);
      const decryptedStr = decryptedJson.toString("utf-8").trim();

      let metadata: AdaumcMetadata;
      try {
        metadata = JSON.parse(decryptedStr);
      } catch (jsonErr) {
        // Fallback for legacy/corrupted test containers where logs array was truncated at header boundary
        const logsIdx = decryptedStr.lastIndexOf('"logs"');
        if (logsIdx > 0) {
          try {
            const repairedStr = decryptedStr.substring(0, logsIdx).replace(/,\s*$/, "") + ', "logs":[]}';
            metadata = JSON.parse(repairedStr);
          } catch (e) {
            const lastBrace = decryptedStr.lastIndexOf("}");
            if (lastBrace > 0) {
              try {
                metadata = JSON.parse(decryptedStr.substring(0, lastBrace + 1));
              } catch (e2) {
                throw jsonErr;
              }
            } else {
              throw jsonErr;
            }
          }
        } else {
          const lastBrace = decryptedStr.lastIndexOf("}");
          if (lastBrace > 0) {
            try {
              metadata = JSON.parse(decryptedStr.substring(0, lastBrace + 1));
            } catch (e2) {
              throw jsonErr;
            }
          } else {
            throw jsonErr;
          }
        }
      }

      const payloadStartOffset = jsonStartOffset + indexLen;
      const result = { metadata, payloadStartOffset };
      this.metadataCache.set(bundlePath, { ...result, mtimeMs: stat.mtimeMs });
      return result;
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * Overwrites the encrypted 16KB metadata header at offset 10 in an .adaumc container file
   */
  public static writeMetadataHeader(
    bundlePath: string,
    metadata: AdaumcMetadata,
  ): void {
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle file not found: ${bundlePath}`);
    }

    const HEADER_OFFSET = 16384;
    const targetLength = HEADER_OFFSET - 10;

    let headerLogs = metadata.logs || [];
    let jsonStr = JSON.stringify({ ...metadata, logs: headerLogs });

    while (jsonStr.length > targetLength && headerLogs.length > 0) {
      headerLogs = headerLogs.slice(1);
      jsonStr = JSON.stringify({ ...metadata, logs: headerLogs });
    }

    if (jsonStr.length > targetLength) {
      jsonStr = JSON.stringify({ ...metadata, logs: [] });
    }

    if (jsonStr.length > targetLength) {
      jsonStr = jsonStr.substring(0, targetLength);
    } else {
      jsonStr = jsonStr.padEnd(targetLength, " ");
    }

    const jsonBuf = Buffer.from(jsonStr, "utf-8");
    const encryptedIndex = this.applyStreamCipherMask(jsonBuf, 0);

    const fd = fs.openSync(bundlePath, "r+");
    try {
      fs.writeSync(fd, encryptedIndex, 0, targetLength, 10);
    } finally {
      fs.closeSync(fd);
    }

    this.metadataCache.delete(bundlePath);
  }

  /**
   * Dynamically appends a subtitle track (.srt, .vtt, .ass, .sub) into an .adaumc bundle file
   */
  public static async addSubtitleTrack(
    bundlePath: string,
    subtitleFilePath: string,
    label?: string,
    lang?: string,
  ): Promise<{ assetKey: string; metadata: AdaumcMetadata }> {
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle file not found: ${bundlePath}`);
    }
    if (!fs.existsSync(subtitleFilePath)) {
      throw new Error(`Subtitle file not found: ${subtitleFilePath}`);
    }

    const rawText = fs.readFileSync(subtitleFilePath, "utf-8");
    let vttText = rawText.trim();
    if (!vttText.startsWith("WEBVTT")) {
      vttText = vttText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
      vttText = vttText.replace(/(\d{2}:\d{2}),(\d{3})/g, "$1.$2");
      vttText = `WEBVTT\n\n${vttText}`;
    }

    const vttBuf = Buffer.from(vttText, "utf-8");
    const stat = fs.statSync(bundlePath);
    const HEADER_OFFSET = 16384;
    const currentOffset = Math.max(0, stat.size - HEADER_OFFSET);

    const encryptedSub = this.applyStreamCipherMask(vttBuf, currentOffset);
    fs.appendFileSync(bundlePath, encryptedSub);

    const { metadata } = this.readMetadata(bundlePath);
    const cleanLang = (lang || "en").toLowerCase().replace(/[^a-z0-9]/g, "");
    const subCount =
      Object.keys(metadata.assets || {}).filter((k) => k.startsWith("sub_")).length + 1;
    const assetKey = `sub_${cleanLang}_${subCount}`;
    const subLabel =
      label || path.basename(subtitleFilePath, path.extname(subtitleFilePath));

    if (!metadata.assets) {
      metadata.assets = {};
    }

    metadata.assets[assetKey] = {
      offset: currentOffset,
      length: vttBuf.length,
      filename: `${assetKey}.vtt`,
      mimeType: "text/vtt",
    };
    (metadata.assets[assetKey] as any).label = subLabel;
    (metadata.assets[assetKey] as any).lang = cleanLang;

    this.writeMetadataHeader(bundlePath, metadata);
    return { assetKey, metadata };
  }

  /**
   * Dynamically removes a subtitle track asset key from an .adaumc bundle metadata header
   */
  public static async removeSubtitleTrack(
    bundlePath: string,
    assetKey: string,
  ): Promise<{ assetKey: string; metadata: AdaumcMetadata }> {
    const { metadata } = this.readMetadata(bundlePath);
    if (metadata.assets && metadata.assets[assetKey]) {
      delete metadata.assets[assetKey];
      this.writeMetadataHeader(bundlePath, metadata);
    }
    return { assetKey, metadata };
  }

  /**
   * Creates a Web ReadableStream for Range Streaming using Node.js asynchronous libuv threadpool (non-blocking)
   */
  public static createAssetStream(
    bundlePath: string,
    assetKey: string,
    startByte?: number,
    endByte?: number,
  ): {
    stream: ReadableStream;
    mimeType: string;
    totalSize: number;
    start: number;
    end: number;
  } {
    const { metadata, payloadStartOffset } = this.readMetadata(bundlePath);
    const asset = metadata.assets[assetKey];

    if (!asset) {
      throw new Error(
        `Asset key '${assetKey}' not found in bundle ${bundlePath}`,
      );
    }

    const assetStartInFile = payloadStartOffset + asset.offset;
    const totalSize = asset.length || asset.size || 0;

    const start = startByte !== undefined ? Math.max(0, startByte) : 0;
    const end =
      endByte !== undefined ? Math.min(totalSize - 1, endByte) : totalSize - 1;

    // Asynchronous file stream using highWaterMark buffer for smooth 1080p/4K playback
    const fileStream = fs.createReadStream(bundlePath, {
      start: assetStartInFile + start,
      end: assetStartInFile + end,
      highWaterMark: 1024 * 1024, // 1MB chunk size
    });

    const cipherTransform = new CipherTransform(asset.offset + start);
    const transformedStream = fileStream.pipe(cipherTransform);
    const webStream = (Readable.toWeb as any)(transformedStream) as ReadableStream;

    return {
      stream: webStream,
      mimeType: asset.mimeType || "video/mp4",
      totalSize,
      start,
      end,
    };
  }

  private static assetSliceCache = new Map<
    string,
    {
      buffer: Buffer;
      mimeType: string;
      totalSize: number;
      start: number;
      end: number;
      mtimeMs: number;
    }
  >();
  private static MAX_ASSET_CACHE_ENTRIES = 120;

  /**
   * Reads a slice of an asset from within an .adaumc container for Range Streaming (with LRU RAM caching for fast response)
   */
  public static readAssetSlice(
    bundlePath: string,
    assetKey: string,
    startByte?: number,
    endByte?: number,
  ): {
    buffer: Buffer;
    mimeType: string;
    totalSize: number;
    start: number;
    end: number;
  } {
    const { metadata, payloadStartOffset } = this.readMetadata(bundlePath);
    const asset = metadata.assets[assetKey];

    if (!asset) {
      if (assetKey === "vtt") {
        const fallbackBuf = Buffer.from("WEBVTT\n\n", "utf-8");
        return {
          buffer: fallbackBuf,
          mimeType: "text/vtt",
          totalSize: fallbackBuf.length,
          start: 0,
          end: fallbackBuf.length - 1,
        };
      }
      throw new Error(
        `Asset key '${assetKey}' not found in bundle ${bundlePath}`,
      );
    }

    const totalSize = asset.length || asset.size || 0;
    const start = startByte !== undefined ? Math.max(0, startByte) : 0;
    const end =
      endByte !== undefined ? Math.min(totalSize - 1, endByte) : totalSize - 1;
    const chunkSize = end - start + 1;

    // Check RAM Cache for small/static assets (thumbnails, GIFs, sprites, VTTs)
    const cacheKey = `${bundlePath}:${assetKey}:${start}:${end}`;
    const cached = this.assetSliceCache.get(cacheKey);
    if (cached) {
      return {
        buffer: cached.buffer,
        mimeType: cached.mimeType,
        totalSize: cached.totalSize,
        start: cached.start,
        end: cached.end,
      };
    }

    const assetStartInFile = payloadStartOffset + asset.offset;
    const fd = fs.openSync(bundlePath, "r");
    try {
      const rawBuf = Buffer.alloc(chunkSize);
      fs.readSync(fd, rawBuf, 0, chunkSize, assetStartInFile + start);

      // Demask chunk payload
      const demasked = this.applyStreamCipherMask(rawBuf, asset.offset + start);
      const result = {
        buffer: demasked,
        mimeType: asset.mimeType || "image/jpeg",
        totalSize,
        start,
        end,
      };

      // Cache if under 8MB (covers thumbnails, animated gifs, and metadata)
      if (chunkSize <= 8 * 1024 * 1024) {
        if (this.assetSliceCache.size >= this.MAX_ASSET_CACHE_ENTRIES) {
          const firstKey = this.assetSliceCache.keys().next().value;
          if (firstKey) this.assetSliceCache.delete(firstKey);
        }
        this.assetSliceCache.set(cacheKey, { ...result, mtimeMs: Date.now() });
      }

      return result;
    } finally {
      fs.closeSync(fd);
    }
  }
}
