import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";
import { BundleManager, ADAUMC_MAGIC } from "../src/main/bundle_manager";

describe("BundleManager & ADAUMC Container Engine", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "adaumc_test_"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should have correct ADAUMC magic bytes", () => {
    expect(ADAUMC_MAGIC.toString()).toBe("ADAUMC");
    expect(ADAUMC_MAGIC.length).toBe(6);
  });

  it("should encrypt and decrypt data symmetrically with XOR cipher", () => {
    const originalText = "Hello UniversalMediaStudio ADAUMC 2026! 🚀 Multi-byte test data";
    const originalBuf = Buffer.from(originalText, "utf-8");

    const masked = BundleManager.applyStreamCipherMask(originalBuf, 0);
    expect(masked).not.toEqual(originalBuf);

    const demasked = BundleManager.applyStreamCipherMask(masked, 0);
    expect(demasked.toString("utf-8")).toBe(originalText);
  });

  it("should correctly handle stream cipher offsets across chunk boundaries", () => {
    const fullText = "A".repeat(100);
    const fullBuf = Buffer.from(fullText, "utf-8");
    const maskedFull = BundleManager.applyStreamCipherMask(fullBuf, 0);

    const part1 = fullBuf.subarray(0, 37);
    const part2 = fullBuf.subarray(37);

    const maskedPart1 = BundleManager.applyStreamCipherMask(part1, 0);
    const maskedPart2 = BundleManager.applyStreamCipherMask(part2, 37);

    const combined = Buffer.concat([maskedPart1, maskedPart2]);
    expect(combined).toEqual(maskedFull);
  });

  it("should pack and inspect an .adaumc bundle container with assets", async () => {
    const videoFile = path.join(tempDir, "video.mp4");
    const thumbFile = path.join(tempDir, "thumb.jpg");
    const gifFile = path.join(tempDir, "preview.gif");
    const bundleOut = path.join(tempDir, "test_bundle.adaumc");

    fs.writeFileSync(videoFile, Buffer.from("DUMMY_MP4_VIDEO_PAYLOAD_DATA"));
    fs.writeFileSync(thumbFile, Buffer.from("DUMMY_JPEG_THUMBNAIL_DATA"));
    fs.writeFileSync(gifFile, Buffer.from("DUMMY_GIF_ANIMATED_PREVIEW_DATA"));

    const input = {
      id: "vid_test_101",
      title: "Test Movie Trailer",
      duration: 120,
      resolution: "1920x1080",
      tags: ["Genre:Sci-Fi", "Series:Matrix"],
      assets: [
        { key: "video", filePath: videoFile, mimeType: "video/mp4" },
        { key: "thumbnail", filePath: thumbFile, mimeType: "image/jpeg" },
        { key: "gif", filePath: gifFile, mimeType: "image/gif" },
      ],
      outputPath: bundleOut,
    };

    const createdPath = await BundleManager.packBundle(input);
    expect(fs.existsSync(createdPath)).toBe(true);

    const { metadata } = BundleManager.readMetadata(createdPath);
    expect(metadata.id).toBe("vid_test_101");
    expect(metadata.title).toBe("Test Movie Trailer");
    expect(metadata.duration).toBe(120);
    expect(metadata.resolution).toBe("1920x1080");
    expect(metadata.tags).toContain("Genre:Sci-Fi");
    expect(metadata.assets.video).toBeDefined();
    expect(metadata.assets.thumbnail).toBeDefined();
    expect(metadata.assets.gif).toBeDefined();

    // Verify asset slice reading
    const thumbSlice = BundleManager.readAssetSlice(createdPath, "thumbnail");
    expect(thumbSlice.buffer.toString("utf-8")).toBe("DUMMY_JPEG_THUMBNAIL_DATA");
    expect(thumbSlice.mimeType).toBe("image/jpeg");

    const videoSlice = BundleManager.readAssetSlice(createdPath, "video");
    expect(videoSlice.buffer.toString("utf-8")).toBe("DUMMY_MP4_VIDEO_PAYLOAD_DATA");
  });

  it("should dynamically add and remove subtitles from an .adaumc bundle", async () => {
    const videoFile = path.join(tempDir, "video.mp4");
    const subFile = path.join(tempDir, "sub_en.srt");
    const bundleOut = path.join(tempDir, "test_subs.adaumc");

    fs.writeFileSync(videoFile, Buffer.from("VIDEO_DATA"));
    fs.writeFileSync(
      subFile,
      "1\n00:00:01,000 --> 00:00:04,000\nHello World Subtitle!\n",
    );

    const input = {
      id: "vid_sub_test",
      title: "Subtitle Test",
      duration: 60,
      resolution: "1080p",
      tags: [],
      assets: [{ key: "video", filePath: videoFile, mimeType: "video/mp4" }],
      outputPath: bundleOut,
    };

    await BundleManager.packBundle(input);

    const { assetKey, metadata } = await BundleManager.addSubtitleTrack(
      bundleOut,
      subFile,
      "English Subs",
      "en",
    );

    expect(assetKey).toBe("sub_en_1");
    expect(metadata.assets["sub_en_1"]).toBeDefined();
    expect(metadata.assets["sub_en_1"].mimeType).toBe("text/vtt");

    // Read and verify added subtitle slice
    const subSlice = BundleManager.readAssetSlice(bundleOut, "sub_en_1");
    expect(subSlice.buffer.toString("utf-8")).toContain("WEBVTT");
    expect(subSlice.buffer.toString("utf-8")).toContain("Hello World Subtitle!");

    // Remove subtitle
    const removedResult = await BundleManager.removeSubtitleTrack(bundleOut, "sub_en_1");
    expect(removedResult.metadata.assets["sub_en_1"]).toBeUndefined();
  });
});
