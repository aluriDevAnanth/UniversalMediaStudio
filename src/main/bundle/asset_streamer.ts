import fs from "fs";
import { Readable } from "stream";
import { AdaumcMetadata } from "./types";
import { CipherTransform } from "./cipher_transform";
import { MetadataReader } from "./metadata_reader";
import { applyStreamCipher } from "../native_cipher";

export class AssetStreamer {
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

  public static getSliceCache() {
    return this.assetSliceCache;
  }

  public static invalidateBundleCache(bundlePath: string) {
    for (const key of this.assetSliceCache.keys()) {
      if (key.startsWith(`${bundlePath}:`)) {
        this.assetSliceCache.delete(key);
      }
    }
  }

  public static getOptimalBufferSize(metadata: AdaumcMetadata, assetKey: string): number {
    if (assetKey !== "video") return 1024 * 1024;
    const asset = metadata.assets?.[assetKey];
    const totalSize = asset?.length || asset?.size || 0;
    const duration = metadata.duration || 0;
    const estBitrate = duration > 0 ? (totalSize * 8) / duration : 0;
    const res = (metadata.resolution || "").toLowerCase();
    const is4K = res.includes("4k") || res.includes("2160") || res.includes("3840");

    if (is4K || estBitrate > 15_000_000 || totalSize > 1024 * 1024 * 1024) {
      return 8 * 1024 * 1024;
    }
    if (estBitrate > 3_000_000 || totalSize > 250 * 1024 * 1024 || res.includes("1080")) {
      return 4 * 1024 * 1024;
    }
    return 1024 * 1024;
  }

  public static createAssetStream(
    bundlePath: string,
    assetKey: string,
    startByte?: number,
    endByte?: number,
    maxChunkSize?: number,
    abortSignal?: AbortSignal,
  ): {
    stream: ReadableStream;
    mimeType: string;
    totalSize: number;
    start: number;
    end: number;
  } {
    const { metadata, payloadStartOffset } = MetadataReader.readMetadata(bundlePath);
    let asset = metadata.assets[assetKey];

    if (!asset && assetKey === "gif" && metadata.assets?.["thumbnail"]) {
      asset = metadata.assets["thumbnail"];
    }

    if (!asset) {
      throw new Error(`Asset key '${assetKey}' not found in bundle ${bundlePath}`);
    }

    const assetStartInFile = payloadStartOffset + asset.offset;
    const totalSize = asset.length || asset.size || 0;

    const start = startByte !== undefined ? Math.max(0, startByte) : 0;
    let end: number;

    if (endByte !== undefined) {
      end = Math.min(totalSize - 1, endByte);
    } else if (maxChunkSize && maxChunkSize > 0) {
      end = Math.min(totalSize - 1, start + maxChunkSize - 1);
    } else {
      end = totalSize - 1;
    }

    const optimalBuffer = Math.max(
      this.getOptimalBufferSize(metadata, assetKey),
      maxChunkSize || 0,
    );

    const fileStream = fs.createReadStream(bundlePath, {
      start: assetStartInFile + start,
      end: assetStartInFile + end,
      highWaterMark: optimalBuffer,
    });

    const cipherTransform = new CipherTransform(asset.offset + start);
    const transformedStream = fileStream.pipe(cipherTransform);

    if (abortSignal) {
      if (abortSignal.aborted) {
        fileStream.destroy();
        cipherTransform.destroy();
      } else {
        const onAbort = () => {
          fileStream.destroy();
          cipherTransform.destroy();
        };
        abortSignal.addEventListener("abort", onAbort, { once: true });
        transformedStream.on("close", () => {
          abortSignal.removeEventListener("abort", onAbort);
        });
      }
    }

    const webStream = (Readable.toWeb as any)(transformedStream) as ReadableStream;

    return {
      stream: webStream,
      mimeType: asset.mimeType || "video/mp4",
      totalSize,
      start,
      end,
    };
  }

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
    const { metadata, payloadStartOffset } = MetadataReader.readMetadata(bundlePath);
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
      if (assetKey === "gif" && metadata.assets?.["thumbnail"]) {
        return this.readAssetSlice(bundlePath, "thumbnail", startByte, endByte);
      }
      if (assetKey.startsWith("sprite_") && metadata.assets?.["thumbnail"]) {
        return this.readAssetSlice(bundlePath, "thumbnail", startByte, endByte);
      }
      throw new Error(`Asset key '${assetKey}' not found in bundle ${bundlePath}`);
    }

    const totalSize = asset.length || asset.size || 0;
    const start = startByte !== undefined ? Math.max(0, startByte) : 0;
    const end = endByte !== undefined ? Math.min(totalSize - 1, endByte) : totalSize - 1;
    const chunkSize = end - start + 1;

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

      const demasked = applyStreamCipher(rawBuf, asset.offset + start);
      const result = {
        buffer: demasked,
        mimeType: asset.mimeType || "image/jpeg",
        totalSize,
        start,
        end,
      };

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
