import fs from "fs";
import { AdaumcMetadata } from "./types";
import { HEADER_OFFSET } from "./constants";
import { MetadataReader } from "./metadata_reader";
import { applyStreamCipher } from "../native_cipher";

export class MetadataWriter {
  public static writeMetadataHeader(
    bundlePath: string,
    metadata: AdaumcMetadata,
    onInvalidateCache?: () => void,
  ): void {
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle file not found: ${bundlePath}`);
    }

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
    const encryptedIndex = applyStreamCipher(jsonBuf, 0);

    const fd = fs.openSync(bundlePath, "r+");
    try {
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(encryptedIndex.length, 0);
      fs.writeSync(fd, lenBuf, 0, 4, 6);
      fs.writeSync(fd, encryptedIndex, 0, encryptedIndex.length, 10);
    } finally {
      fs.closeSync(fd);
    }

    MetadataReader.getCache().delete(bundlePath);
    if (onInvalidateCache) {
      onInvalidateCache();
    }
  }
}
