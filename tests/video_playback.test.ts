import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { BundleManager } from "../src/main/bundle_manager";
import { parseRangeHeader } from "../src/main/protocol";

describe("Video Playback & Range Streaming Verification", () => {
  const tempDir = path.join(os.tmpdir(), `ums_playback_test_${Date.now()}`);
  const videoPayloadSize = 2 * 1024 * 1024; // 2 MB synthetic video data
  const originalVideoBytes = Buffer.alloc(videoPayloadSize);

  // Fill with deterministic pseudo-random sequence for byte-level validation
  for (let i = 0; i < videoPayloadSize; i++) {
    originalVideoBytes[i] = (i * 37 + 13) & 0xff;
  }

  const thumbBytes = Buffer.from("FAKE_JPEG_THUMBNAIL_BYTES_FOR_PLAYBACK_TEST");
  const bundlePath = path.join(tempDir, "playback_test.adaumc");
  const videoFilePath = path.join(tempDir, "video.mp4");
  const thumbFilePath = path.join(tempDir, "thumb.jpg");

  beforeAll(async () => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(videoFilePath, originalVideoBytes);
    fs.writeFileSync(thumbFilePath, thumbBytes);

    await BundleManager.packBundle({
      id: "playback_vid_1",
      title: "Playback Test Video",
      duration: 120,
      resolution: "1920x1080",
      tags: ["Genre:Test", "Codec:H264"],
      assets: [
        { key: "video", filePath: videoFilePath, mimeType: "video/mp4" },
        { key: "thumbnail", filePath: thumbFilePath, mimeType: "image/jpeg" },
      ],
      outputPath: bundlePath,
    });
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe("HTTP Range Header Parser (RFC 7233 Standard)", () => {
    const totalSize = 1000000; // 1 MB

    it("should parse standard closed byte ranges (e.g. bytes=0-499)", () => {
      const res = parseRangeHeader("bytes=0-499", totalSize);
      expect(res).not.toBeNull();
      expect(res?.start).toBe(0);
      expect(res?.end).toBe(499);
      expect(res?.contentLength).toBe(500);
      expect(res?.isSatisfiable).toBe(true);
    });

    it("should parse open-ended byte ranges (e.g. bytes=500000-)", () => {
      const res = parseRangeHeader("bytes=500000-", totalSize);
      expect(res).not.toBeNull();
      expect(res?.start).toBe(500000);
      expect(res?.end).toBe(totalSize - 1);
      expect(res?.contentLength).toBe(500000);
      expect(res?.isSatisfiable).toBe(true);
    });

    it("should parse suffix byte ranges (e.g. bytes=-10000 for trailing metadata)", () => {
      const res = parseRangeHeader("bytes=-10000", totalSize);
      expect(res).not.toBeNull();
      expect(res?.start).toBe(totalSize - 10000);
      expect(res?.end).toBe(totalSize - 1);
      expect(res?.contentLength).toBe(10000);
      expect(res?.isSatisfiable).toBe(true);
    });

    it("should handle multi-range headers by taking the first range", () => {
      const res = parseRangeHeader("bytes=0-100, 200-300", totalSize);
      expect(res).not.toBeNull();
      expect(res?.start).toBe(0);
      expect(res?.end).toBe(100);
      expect(res?.contentLength).toBe(101);
    });

    it("should identify out-of-range unsatisfiable requests", () => {
      const res = parseRangeHeader("bytes=2000000-2500000", totalSize);
      expect(res).not.toBeNull();
      expect(res?.isSatisfiable).toBe(false);
    });

    it("should return null for malformed or non-range headers", () => {
      expect(parseRangeHeader(undefined, totalSize)).toBeNull();
      expect(parseRangeHeader("invalid-range", totalSize)).toBeNull();
      expect(parseRangeHeader("bytes=-", totalSize)).toBeNull();
    });
  });

  describe("ADAUMC Range Streaming & Demasking Fidelity", () => {
    it("should extract initial playback header bytes (bytes=0-4095) matching original video", async () => {
      const streamRes = BundleManager.createAssetStream(
        bundlePath,
        "video",
        0,
        4095,
      );

      expect(streamRes.mimeType).toBe("video/mp4");
      expect(streamRes.totalSize).toBe(videoPayloadSize);
      expect(streamRes.start).toBe(0);
      expect(streamRes.end).toBe(4095);

      // Read all bytes from web stream
      const reader = streamRes.stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const readBuffer = Buffer.concat(chunks);

      expect(readBuffer.length).toBe(4096);
      expect(readBuffer.equals(originalVideoBytes.subarray(0, 4096))).toBe(true);
    });

    it("should accurately stream arbitrary seek offsets (e.g. bytes=524288-1048575)", async () => {
      const start = 512 * 1024;
      const end = 1024 * 1024 - 1;
      const streamRes = BundleManager.createAssetStream(
        bundlePath,
        "video",
        start,
        end,
      );

      const reader = streamRes.stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const readBuffer = Buffer.concat(chunks);

      expect(readBuffer.length).toBe(end - start + 1);
      expect(readBuffer.equals(originalVideoBytes.subarray(start, end + 1))).toBe(true);
    });

    it("should stream open-ended ranges to EOF without data corruption", async () => {
      const seekStart = videoPayloadSize - 100 * 1024; // last 100KB
      const streamRes = BundleManager.createAssetStream(
        bundlePath,
        "video",
        seekStart,
        undefined,
      );

      expect(streamRes.end).toBe(videoPayloadSize - 1);

      const reader = streamRes.stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const readBuffer = Buffer.concat(chunks);

      expect(readBuffer.length).toBe(100 * 1024);
      expect(
        readBuffer.equals(originalVideoBytes.subarray(seekStart, videoPayloadSize)),
      ).toBe(true);
    });

    it("should handle stream cancellation via AbortSignal when client seeks", async () => {
      const controller = new AbortController();
      const streamRes = BundleManager.createAssetStream(
        bundlePath,
        "video",
        0,
        videoPayloadSize - 1,
        undefined,
        controller.signal,
      );

      const reader = streamRes.stream.getReader();
      // Read first chunk
      const firstChunk = await reader.read();
      expect(firstChunk.value).toBeDefined();

      // Trigger client seek / pause abort
      controller.abort();

      // Subsequent read should close or complete cleanly
      try {
        await reader.read();
      } catch (e: any) {
        // Expected cancellation
        expect(e).toBeDefined();
      }
    });

    it("should correctly stream suffix ranges (e.g. bytes=-65536) for reading EOF metadata atoms", async () => {
      const suffixSize = 65536;
      const start = videoPayloadSize - suffixSize;
      const streamRes = BundleManager.createAssetStream(
        bundlePath,
        "video",
        start,
        videoPayloadSize - 1,
      );

      expect(streamRes.start).toBe(start);
      expect(streamRes.end).toBe(videoPayloadSize - 1);

      const reader = streamRes.stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const readBuffer = Buffer.concat(chunks);

      expect(readBuffer.length).toBe(suffixSize);
      expect(
        readBuffer.equals(originalVideoBytes.subarray(start, videoPayloadSize)),
      ).toBe(true);
    });

    it("should correctly serve preview assets (thumbnails) via sliced caching", () => {
      const slice = BundleManager.readAssetSlice(bundlePath, "thumbnail");
      expect(slice.mimeType).toBe("image/jpeg");
      expect(slice.buffer.equals(thumbBytes)).toBe(true);
    });
  });
});
