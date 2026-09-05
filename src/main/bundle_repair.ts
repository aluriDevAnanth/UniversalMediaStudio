import fs from "fs";
import path from "path";
import os from "os";
import { BundleManager } from "./bundle_manager";
import { FFmpegProcessor } from "./ffmpeg_worker";

export class BundleRepairManager {
  /**
   * Optimizes an existing .adaumc bundle by extracting its video stream,
   * applying FFmpeg -movflags +faststart, and repackaging the bundle in-place.
   */
  public static async optimizeExistingBundle(
    bundlePath: string,
  ): Promise<{ success: boolean; bundlePath: string; wasOptimized: boolean; message: string }> {
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle file not found: ${bundlePath}`);
    }

    const { metadata, payloadStartOffset } = BundleManager.readMetadata(bundlePath);
    const videoAsset = metadata.assets?.video;
    if (!videoAsset) {
      return {
        success: false,
        bundlePath,
        wasOptimized: false,
        message: "No video asset found in bundle",
      };
    }

    const tempDir = path.join(os.tmpdir(), `ums_optimize_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const extractedRawVideo = path.join(tempDir, "extracted_video.mp4");
      const optimizedMp4 = path.join(tempDir, "optimized_video.mp4");

      // 1. Extract and demask video asset into temp raw video
      const fd = fs.openSync(bundlePath, "r");
      const writeRawStream = fs.createWriteStream(extractedRawVideo);

      const bufferSize = 1024 * 1024; // 1MB buffer
      const readBuf = Buffer.alloc(bufferSize);
      let bytesLeft = videoAsset.length;
      let currentVideoOffset = 0;

      while (bytesLeft > 0) {
        const toRead = Math.min(bufferSize, bytesLeft);
        const bytesRead = fs.readSync(
          fd,
          readBuf,
          0,
          toRead,
          payloadStartOffset + videoAsset.offset + currentVideoOffset,
        );
        if (bytesRead === 0) break;

        const slice = readBuf.subarray(0, bytesRead);
        const demasked = BundleManager.applyStreamCipherMask(
          slice,
          videoAsset.offset + currentVideoOffset,
        );
        writeRawStream.write(demasked);

        currentVideoOffset += bytesRead;
        bytesLeft -= bytesRead;
      }
      fs.closeSync(fd);
      await new Promise<void>((r) => writeRawStream.end(r));

      // 2. Run faststart remux / normalization
      const normRes = await FFmpegProcessor.prepareStreamableVideo(
        metadata.id,
        extractedRawVideo,
        optimizedMp4,
      );

      // If already optimized, nothing to repack
      if (normRes.streamablePath === extractedRawVideo && !normRes.isTranscoded) {
        return {
          success: true,
          bundlePath,
          wasOptimized: false,
          message: "Bundle video is already faststart optimized",
        };
      }

      // 3. Extract all other assets (thumbnails, gifs, vtt, sprites, etc.)
      const extractedAssets: { key: string; filePath: string; mimeType: string }[] = [];
      for (const [key, asset] of Object.entries(metadata.assets)) {
        if (key === "video") continue;
        const assetSlice = BundleManager.readAssetSlice(bundlePath, key);
        const ext = key === "thumbnail" ? ".jpg" : key === "gif" ? ".gif" : key === "vtt" ? ".vtt" : ".bin";
        const assetFile = path.join(tempDir, `${key}${ext}`);
        fs.writeFileSync(assetFile, assetSlice.buffer);
        extractedAssets.push({
          key,
          filePath: assetFile,
          mimeType: assetSlice.mimeType,
        });
      }

      // 4. Pack fresh bundle with optimized video
      const newBundleTemp = path.join(tempDir, "new_bundle.adaumc");
      await BundleManager.packBundle({
        id: metadata.id,
        title: metadata.title,
        duration: metadata.duration,
        resolution: metadata.resolution,
        tags: metadata.tags || [],
        logs: metadata.logs || [],
        assets: [
          { key: "video", filePath: normRes.streamablePath, mimeType: "video/mp4" },
          ...extractedAssets,
        ],
        outputPath: newBundleTemp,
      });

      // 5. Replace old bundle file in-place
      fs.copyFileSync(newBundleTemp, bundlePath);

      return {
        success: true,
        bundlePath,
        wasOptimized: true,
        message: "Bundle successfully optimized with +faststart and repackaged",
      };
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }
}
