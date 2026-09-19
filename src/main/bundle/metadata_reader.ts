import fs from "fs";
import { AdaumcMetadata } from "./types";
import { ADAUMC_MAGIC } from "./constants";
import { applyStreamCipher } from "../native_cipher";

export class MetadataReader {
  private static metadataCache = new Map<
    string,
    { metadata: AdaumcMetadata; payloadStartOffset: number; mtimeMs: number }
  >();

  public static getCache() {
    return this.metadataCache;
  }

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

      if (checkBuf[0] === 0x01) {
        indexLen = checkBuf.readUInt32BE(1);
        jsonStartOffset = 11;
      } else {
        indexLen = checkBuf.readUInt32BE(0);
        jsonStartOffset = 10;
      }

      const encryptedIndex = Buffer.alloc(indexLen);
      fs.readSync(fd, encryptedIndex, 0, indexLen, jsonStartOffset);

      const decryptedJson = applyStreamCipher(encryptedIndex, 0);
      const decryptedStr = decryptedJson.toString("utf-8").trim();

      let metadata: AdaumcMetadata;
      try {
        metadata = JSON.parse(decryptedStr);
      } catch (jsonErr) {
        const logsIdx = decryptedStr.lastIndexOf('"logs"');
        if (logsIdx > 0) {
          try {
            const repairedStr = decryptedStr.substring(0, logsIdx).replace(/,\s*$/, "") + ', "logs":[]}';
            metadata = JSON.parse(repairedStr);
          } catch {
            const lastBrace = decryptedStr.lastIndexOf("}");
            if (lastBrace > 0) {
              metadata = JSON.parse(decryptedStr.substring(0, lastBrace + 1));
            } else {
              throw jsonErr;
            }
          }
        } else {
          const lastBrace = decryptedStr.lastIndexOf("}");
          if (lastBrace > 0) {
            metadata = JSON.parse(decryptedStr.substring(0, lastBrace + 1));
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
}
