import { protocol } from "electron";
import { BundleManager } from "./bundle_manager";
import { db } from "./db";

export function registerAdaumcProtocol(): void {
  protocol.handle("adaumc", async (request) => {
    try {
      const url = new URL(request.url);
      // Format: adaumc://[videoId]/[assetKey]
      // e.g. adaumc://vid_123/video or adaumc://vid_123/gif
      const videoId = url.hostname;
      let assetKey = url.pathname.replace(/^\//, "") || "video";

      console.log(
        `[adaumc:// protocol request] videoId: '${videoId}', assetKey: '${assetKey}'`,
      );

      const videoRecord = db.getVideo(videoId);
      if (!videoRecord || !videoRecord.bundlePath) {
        console.warn(
          `[adaumc:// protocol warn] Video record not found for videoId '${videoId}'`,
        );
        return new Response("Video bundle not found", { status: 404 });
      }

      const rangeHeader = request.headers.get("Range");
      let startByte: number | undefined;
      let endByte: number | undefined;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        if (parts[0]) startByte = parseInt(parts[0], 10);
        if (parts[1] && parts[1] !== "") endByte = parseInt(parts[1], 10);
      }

      // For video streaming, use ReadableStream (matching YTDLPY get_asset_stream)
      if (assetKey === "video") {
        const streamResult = BundleManager.createAssetStream(
          videoRecord.bundlePath,
          assetKey,
          startByte,
          endByte,
        );

        const contentLength = (
          streamResult.end -
          streamResult.start +
          1
        ).toString();

        if (rangeHeader) {
          return new Response(streamResult.stream as any, {
            status: 206,
            headers: {
              "Content-Type": streamResult.mimeType || "video/mp4",
              "Content-Range": `bytes ${streamResult.start}-${streamResult.end}/${streamResult.totalSize}`,
              "Accept-Ranges": "bytes",
              "Content-Length": contentLength,
            },
          });
        } else {
          return new Response(streamResult.stream as any, {
            status: 200,
            headers: {
              "Content-Type": streamResult.mimeType || "video/mp4",
              "Content-Length": streamResult.totalSize.toString(),
              "Accept-Ranges": "bytes",
            },
          });
        }
      }

      // For static thumbnail, gif, vtt, sprite, subtitle assets:
      const slice = BundleManager.readAssetSlice(
        videoRecord.bundlePath,
        assetKey,
        startByte,
        endByte,
      );

      const responseMimeType = slice.mimeType || "application/octet-stream";

      if (rangeHeader) {
        return new Response(slice.buffer as any, {
          status: 206,
          headers: {
            "Content-Type": responseMimeType,
            "Content-Range": `bytes ${slice.start}-${slice.end}/${slice.totalSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": slice.buffer.length.toString(),
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
