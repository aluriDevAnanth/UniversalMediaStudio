import fs from "fs";
import path from "path";
import { AdaumcMetadata } from "./types";
import { MetadataReader } from "./metadata_reader";
import { MetadataWriter } from "./metadata_writer";
import { applyStreamCipher } from "../native_cipher";

export class SubtitleManager {
  public static async addSubtitleTrack(
    bundlePath: string,
    subtitleFilePath: string,
    label?: string,
    lang?: string,
    onInvalidateCache?: () => void,
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
    const { metadata, payloadStartOffset } = MetadataReader.readMetadata(bundlePath);
    const stat = fs.statSync(bundlePath);
    const currentOffset = Math.max(0, stat.size - payloadStartOffset);

    const encryptedSub = applyStreamCipher(vttBuf, currentOffset);
    fs.appendFileSync(bundlePath, encryptedSub);

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

    MetadataWriter.writeMetadataHeader(bundlePath, metadata, onInvalidateCache);
    return { assetKey, metadata };
  }

  public static async removeSubtitleTrack(
    bundlePath: string,
    assetKey: string,
    onInvalidateCache?: () => void,
  ): Promise<{ assetKey: string; metadata: AdaumcMetadata }> {
    const { metadata } = MetadataReader.readMetadata(bundlePath);
    if (metadata.assets && metadata.assets[assetKey]) {
      delete metadata.assets[assetKey];
      MetadataWriter.writeMetadataHeader(bundlePath, metadata, onInvalidateCache);
    }
    return { assetKey, metadata };
  }

  public static async appendAssetsToBundle(
    bundlePath: string,
    assets: { key: string; filePath: string; mimeType: string }[],
    onInvalidateCache?: () => void,
  ): Promise<AdaumcMetadata> {
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle file not found: ${bundlePath}`);
    }

    const { metadata, payloadStartOffset } = MetadataReader.readMetadata(bundlePath);
    const stat = fs.statSync(bundlePath);
    let currentOffset = Math.max(0, stat.size - payloadStartOffset);

    if (!metadata.assets) {
      metadata.assets = {};
    }

    const chunksToAppend: Buffer[] = [];

    for (const asset of assets) {
      if (fs.existsSync(asset.filePath)) {
        const fileStat = fs.statSync(asset.filePath);
        const data = fs.readFileSync(asset.filePath);
        const encrypted = applyStreamCipher(data, currentOffset);
        chunksToAppend.push(encrypted);

        metadata.assets[asset.key] = {
          offset: currentOffset,
          length: fileStat.size,
          filename: path.basename(asset.filePath),
          mimeType: asset.mimeType,
        };

        currentOffset += fileStat.size;
      }
    }

    if (chunksToAppend.length > 0) {
      const combined = Buffer.concat(chunksToAppend);
      fs.appendFileSync(bundlePath, combined);
    }

    MetadataWriter.writeMetadataHeader(bundlePath, metadata, onInvalidateCache);
    return metadata;
  }
}
