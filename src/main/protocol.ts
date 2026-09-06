import { BundleManager } from "./bundle_manager";
import { db } from "./db";
import { CacheManager } from "./cache_manager";

let electronProtocol: any = null;
try {
  const electron = require("electron");
  electronProtocol = electron?.protocol || electron?.default?.protocol || null;
} catch {}

export interface ParsedRange {
  start: number;
  end: number;
  contentLength: number;
  isSatisfiable: boolean;
}

/**
 * Parses HTTP Range headers according to RFC 7233 standards
 */
export function parseRangeHeader(
  rangeHeader: string | null | undefined,
  totalSize: number,
): ParsedRange | null {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return null;
  }

  const rangePart = rangeHeader.replace(/^bytes=/, "").trim();
  // Handle first range in comma-separated list
  const firstRange = rangePart.split(",")[0].trim();
  const [startStr, endStr] = firstRange.split("-");

  if (!startStr && !endStr) {
    return null;
  }

  let start: number;
  let end: number;

  if (!startStr && endStr) {
    // Suffix byte range: e.g. "bytes=-500" (last 500 bytes)
    const suffixLength = parseInt(endStr, 10);
    if (isNaN(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else if (startStr && !endStr) {
    // Open-ended range: e.g. "bytes=500-"
    start = parseInt(startStr, 10);
    if (isNaN(start) || start < 0) return null;
    end = totalSize - 1;
  } else {
    // Explicit range: e.g. "bytes=0-499"
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end) || start < 0 || end < start) return null;
    end = Math.min(totalSize - 1, end);
  }

  const isSatisfiable = start < totalSize && start <= end;
  const contentLength = isSatisfiable ? end - start + 1 : 0;

  return {
    start,
    end,
    contentLength,
    isSatisfiable,
  };
}

export function registerAdaumcProtocol(): void {
  if (!electronProtocol || typeof electronProtocol.handle !== "function") {
    return;
  }

  electronProtocol.handle("adaumc", async (request: any) => {
    try {
      const url = new URL(request.url);
      // Format: adaumc://[videoId]/[assetKey]
      const videoId = url.hostname;
      let assetKey = url.pathname.replace(/^\//, "") || "video";

      const videoRecord = db.getVideo(videoId);
      if (!videoRecord || !videoRecord.bundlePath) {
        return new Response("Video bundle not found", { status: 404 });
      }

      const rangeHeader =
        request.headers.get("Range") || request.headers.get("range");

      // For video streaming:
      if (assetKey === "video") {
        const { metadata } = BundleManager.readMetadata(videoRecord.bundlePath);
        const asset = metadata.assets[assetKey];
        if (!asset) {
          return new Response("Video asset not found in bundle", { status: 404 });
        }

        const totalSize = asset.length || asset.size || 0;
        const parsedRange = parseRangeHeader(rangeHeader, totalSize);

        if (rangeHeader && parsedRange && !parsedRange.isSatisfiable) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${totalSize}`,
              "Accept-Ranges": "bytes",
            },
          });
        }

        const startByte = parsedRange ? parsedRange.start : 0;
        const endByte = parsedRange ? parsedRange.end : totalSize - 1;

        const isSeek = startByte > 0;
        const seekBufferSize = isSeek ? 8 * 1024 * 1024 : undefined;

        const streamResult = BundleManager.createAssetStream(
          videoRecord.bundlePath,
          assetKey,
          startByte,
          endByte,
          seekBufferSize,
          request.signal,
        );

        // Prefetch subsequent segment in background (next 16MB)
        const nextSegmentStart = endByte + 1;
        const nextSegmentEnd = Math.min(totalSize - 1, nextSegmentStart + 16 * 1024 * 1024);
        if (nextSegmentStart < totalSize) {
          const { payloadStartOffset } = BundleManager.readMetadata(videoRecord.bundlePath);
          CacheManager.getInstance().prefetchSegment(
            videoRecord.bundlePath,
            assetKey,
            nextSegmentStart,
            nextSegmentEnd,
            payloadStartOffset,
            asset.offset,
          );
        }

        const contentLength = (
          streamResult.end -
          streamResult.start +
          1
        ).toString();

        if (rangeHeader && parsedRange) {
          return new Response(streamResult.stream as any, {
            status: 206,
            headers: {
              "Content-Type": streamResult.mimeType || "video/mp4",
              "Content-Range": `bytes ${streamResult.start}-${streamResult.end}/${streamResult.totalSize}`,
              "Accept-Ranges": "bytes",
              "Content-Length": contentLength,
              "Cache-Control": "public, max-age=31536000, immutable",
              "Link": `<adaumc://${videoId}/video>; rel=preconnect`,
            },
          });
        } else {
          return new Response(streamResult.stream as any, {
            status: 200,
            headers: {
              "Content-Type": streamResult.mimeType || "video/mp4",
              "Content-Length": streamResult.totalSize.toString(),
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=31536000, immutable",
              "Link": `<adaumc://${videoId}/video>; rel=preconnect`,
            },
          });
        }
      }

      // For static thumbnail, gif, vtt, sprite, subtitle assets:
      const slice = BundleManager.readAssetSlice(
        videoRecord.bundlePath,
        assetKey,
      );

      const responseMimeType = slice.mimeType || "application/octet-stream";
      const parsedRange = parseRangeHeader(rangeHeader, slice.totalSize);

      if (rangeHeader && parsedRange) {
        if (!parsedRange.isSatisfiable) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${slice.totalSize}`,
              "Accept-Ranges": "bytes",
            },
          });
        }

        const subBuffer = slice.buffer.subarray(
          parsedRange.start,
          parsedRange.end + 1,
        );

        return new Response(subBuffer as any, {
          status: 206,
          headers: {
            "Content-Type": responseMimeType,
            "Content-Range": `bytes ${parsedRange.start}-${parsedRange.end}/${slice.totalSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": subBuffer.length.toString(),
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      } else {
        return new Response(slice.buffer as any, {
          status: 200,
          headers: {
            "Content-Type": responseMimeType,
            "Content-Length": slice.buffer.length.toString(),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      }
    } catch (err: any) {
      console.error("[adaumc:// protocol error]", err);
      return new Response(`Error streaming asset: ${err.message}`, {
        status: 500,
      });
    }
  });
}
