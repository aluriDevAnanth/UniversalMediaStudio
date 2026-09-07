import path from "path";
import fs from "fs";

export interface NativeCipherModule {
  applyStreamCipherSIMD: (
    buffer: Buffer,
    length: number,
    startOffset: number,
  ) => void;
}

let nativeCipherInstance: NativeCipherModule | null = null;

try {
  // Try loading release build from build/Release or prebuilds
  const possiblePaths = [
    path.join(__dirname, "../../build/Release/native_cipher.node"),
    path.join(__dirname, "../build/Release/native_cipher.node"),
    path.join(process.cwd(), "build/Release/native_cipher.node"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      nativeCipherInstance = require(p);
      break;
    }
  }
} catch (e) {
  nativeCipherInstance = null;
}

const MASK_KEY = Buffer.from("AdaumcSecretKey2026!");
const REPEATED_KEY = Buffer.concat([MASK_KEY, MASK_KEY, MASK_KEY, MASK_KEY]);

/**
 * Executes high-performance stream cipher XOR masking.
 * Automatically delegates to native C++ AVX2 SIMD if available,
 * or 8-byte unrolled word-aligned loop in V8.
 */
export function applyStreamCipher(
  data: Buffer,
  startOffset: number = 0,
): Buffer {
  if (nativeCipherInstance) {
    nativeCipherInstance.applyStreamCipherSIMD(data, data.length, startOffset);
    return data;
  }

  const len = data.length;
  const result = Buffer.allocUnsafe(len);
  const keyLen = 20;
  let keyIdx = startOffset % keyLen;

  let i = 0;
  const fastLimit = len - 8;
  while (i <= fastLimit) {
    result[i] = data[i] ^ REPEATED_KEY[keyIdx];
    result[i + 1] = data[i + 1] ^ REPEATED_KEY[keyIdx + 1];
    result[i + 2] = data[i + 2] ^ REPEATED_KEY[keyIdx + 2];
    result[i + 3] = data[i + 3] ^ REPEATED_KEY[keyIdx + 3];
    result[i + 4] = data[i + 4] ^ REPEATED_KEY[keyIdx + 4];
    result[i + 5] = data[i + 5] ^ REPEATED_KEY[keyIdx + 5];
    result[i + 6] = data[i + 6] ^ REPEATED_KEY[keyIdx + 6];
    result[i + 7] = data[i + 7] ^ REPEATED_KEY[keyIdx + 7];
    keyIdx = (keyIdx + 8) % keyLen;
    i += 8;
  }

  while (i < len) {
    result[i] = data[i] ^ REPEATED_KEY[keyIdx];
    keyIdx = (keyIdx + 1) % keyLen;
    i++;
  }

  return result;
}

/**
 * In-place stream cipher transformation
 */
export function applyStreamCipherInPlace(
  data: Buffer,
  startOffset: number = 0,
): void {
  if (nativeCipherInstance) {
    nativeCipherInstance.applyStreamCipherSIMD(data, data.length, startOffset);
    return;
  }

  const len = data.length;
  const keyLen = 20;
  let keyIdx = startOffset % keyLen;

  let i = 0;
  const fastLimit = len - 8;
  while (i <= fastLimit) {
    data[i] ^= REPEATED_KEY[keyIdx];
    data[i + 1] ^= REPEATED_KEY[keyIdx + 1];
    data[i + 2] ^= REPEATED_KEY[keyIdx + 2];
    data[i + 3] ^= REPEATED_KEY[keyIdx + 3];
    data[i + 4] ^= REPEATED_KEY[keyIdx + 4];
    data[i + 5] ^= REPEATED_KEY[keyIdx + 5];
    data[i + 6] ^= REPEATED_KEY[keyIdx + 6];
    data[i + 7] ^= REPEATED_KEY[keyIdx + 7];
    keyIdx = (keyIdx + 8) % keyLen;
    i += 8;
  }

  while (i < len) {
    data[i] ^= REPEATED_KEY[keyIdx];
    keyIdx = (keyIdx + 1) % keyLen;
    i++;
  }
}
