import {
  AdaumcAssetInfo,
  AdaumcMetadata,
  BuildAdaumcInput,
  ADAUMC_MAGIC,
  applyStreamCipher,
  applyStreamCipherInPlace,
  AssetPacker,
  MetadataReader,
  MetadataWriter,
  AssetStreamer,
  SubtitleManager,
} from "./bundle/index";

export type { AdaumcAssetInfo, AdaumcMetadata, BuildAdaumcInput };
export { ADAUMC_MAGIC };

export class BundleManager {
  public static applyStreamCipherMask(
    data: Buffer,
    startOffset: number = 0,
  ): Buffer {
    return applyStreamCipher(data, startOffset);
  }

  public static applyStreamCipherInPlace(
    data: Buffer,
    startOffset: number = 0,
  ): void {
    applyStreamCipherInPlace(data, startOffset);
  }

  public static async packBundle(input: BuildAdaumcInput): Promise<string> {
    return AssetPacker.packBundle(input);
  }

  public static readMetadata(bundlePath: string): {
    metadata: AdaumcMetadata;
    payloadStartOffset: number;
  } {
    return MetadataReader.readMetadata(bundlePath);
  }

  public static writeMetadataHeader(
    bundlePath: string,
    metadata: AdaumcMetadata,
  ): void {
    MetadataWriter.writeMetadataHeader(bundlePath, metadata, () => {
      AssetStreamer.invalidateBundleCache(bundlePath);
    });
  }

  public static async addSubtitleTrack(
    bundlePath: string,
    subtitleFilePath: string,
    label?: string,
    lang?: string,
  ): Promise<{ assetKey: string; metadata: AdaumcMetadata }> {
    return SubtitleManager.addSubtitleTrack(
      bundlePath,
      subtitleFilePath,
      label,
      lang,
      () => AssetStreamer.invalidateBundleCache(bundlePath),
    );
  }

  public static async addSubtitle(
    bundlePath: string,
    subtitleFilePath: string,
    label?: string,
    lang?: string,
  ): Promise<{ assetKey: string; metadata: AdaumcMetadata }> {
    return this.addSubtitleTrack(bundlePath, subtitleFilePath, label, lang);
  }

  public static async removeSubtitleTrack(
    bundlePath: string,
    assetKey: string,
  ): Promise<{ assetKey: string; metadata: AdaumcMetadata }> {
    return SubtitleManager.removeSubtitleTrack(bundlePath, assetKey, () =>
      AssetStreamer.invalidateBundleCache(bundlePath),
    );
  }

  public static async removeSubtitle(
    bundlePath: string,
    assetKey: string,
  ): Promise<{ assetKey: string; metadata: AdaumcMetadata }> {
    return this.removeSubtitleTrack(bundlePath, assetKey);
  }

  public static async appendAssetsToBundle(
    bundlePath: string,
    assets: { key: string; filePath: string; mimeType: string }[],
  ): Promise<AdaumcMetadata> {
    return SubtitleManager.appendAssetsToBundle(bundlePath, assets, () =>
      AssetStreamer.invalidateBundleCache(bundlePath),
    );
  }

  public static getOptimalBufferSize(metadata: AdaumcMetadata, assetKey: string): number {
    return AssetStreamer.getOptimalBufferSize(metadata, assetKey);
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
    return AssetStreamer.createAssetStream(
      bundlePath,
      assetKey,
      startByte,
      endByte,
      maxChunkSize,
      abortSignal,
    );
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
    return AssetStreamer.readAssetSlice(bundlePath, assetKey, startByte, endByte);
  }
}
