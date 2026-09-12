import { describe, it, expect } from "bun:test";
import { applyStreamCipher, applyStreamCipherInPlace } from "../src/main/native_cipher";

describe("Stream Cipher & XOR Masking Engine (src/main/native_cipher.ts)", () => {
  const MASK_KEY = Buffer.from("AdaumcSecretKey2026!"); // 20 bytes key

  it("should encrypt and decrypt symmetrically (round-trip identity)", () => {
    const original = Buffer.from("UniversalMediaStudio High-Performance Stream Cipher Test 2026!");
    const encrypted = applyStreamCipher(original, 0);

    expect(encrypted.equals(original)).toBe(false);

    const decrypted = applyStreamCipher(encrypted, 0);
    expect(decrypted.toString("utf-8")).toBe(original.toString("utf-8"));
  });

  it("should apply correct XOR masking according to key period (20 bytes)", () => {
    const data = Buffer.alloc(40, 0); // 40 zeros
    const masked = applyStreamCipher(data, 0);

    for (let i = 0; i < 40; i++) {
      expect(masked[i]).toBe(MASK_KEY[i % 20]);
    }
  });

  it("should respect arbitrary startOffset for range seek streaming", () => {
    const rawData = Buffer.from("0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF");
    const offset = 7;

    const maskedSlice = applyStreamCipher(rawData, offset);

    for (let i = 0; i < rawData.length; i++) {
      const expectedByte = rawData[i] ^ MASK_KEY[(offset + i) % 20];
      expect(maskedSlice[i]).toBe(expectedByte);
    }

    // Demasking slice with same offset should restore raw data
    const demaskedSlice = applyStreamCipher(maskedSlice, offset);
    expect(demaskedSlice.equals(rawData)).toBe(true);
  });

  it("should perform identical transformation with in-place mutation (applyStreamCipherInPlace)", () => {
    const sample = Buffer.from("Random binary payload testing in-place stream cipher transformation.");
    const sampleCopy = Buffer.from(sample);

    const outOfPlaceResult = applyStreamCipher(sample, 13);
    applyStreamCipherInPlace(sampleCopy, 13);

    expect(sampleCopy.equals(outOfPlaceResult)).toBe(true);

    // Re-applying in-place should return original content
    applyStreamCipherInPlace(sampleCopy, 13);
    expect(sampleCopy.toString("utf-8")).toBe(sample.toString("utf-8"));
  });

  it("should handle empty buffers gracefully without errors", () => {
    const emptyBuf = Buffer.alloc(0);
    const masked = applyStreamCipher(emptyBuf, 0);
    expect(masked.length).toBe(0);

    applyStreamCipherInPlace(emptyBuf, 5);
    expect(emptyBuf.length).toBe(0);
  });

  it("should correctly process unaligned lengths smaller than 8 bytes and unrolled blocks", () => {
    // 1 byte
    const b1 = Buffer.from([42]);
    const m1 = applyStreamCipher(b1, 0);
    expect(m1[0]).toBe(42 ^ MASK_KEY[0]);

    // 7 bytes (less than 8-byte fast loop)
    const b7 = Buffer.from([1, 2, 3, 4, 5, 6, 7]);
    const m7 = applyStreamCipher(b7, 3);
    for (let i = 0; i < 7; i++) {
      expect(m7[i]).toBe(b7[i] ^ MASK_KEY[(3 + i) % 20]);
    }

    // 25 bytes (8 + 8 + 8 + 1)
    const b25 = Buffer.alloc(25, 0xaa);
    const m25 = applyStreamCipher(b25, 11);
    for (let i = 0; i < 25; i++) {
      expect(m25[i]).toBe(0xaa ^ MASK_KEY[(11 + i) % 20]);
    }
  });

  it("should efficiently process large multi-megabyte payloads without data corruption", () => {
    const size = 2 * 1024 * 1024; // 2MB
    const largeBuf = Buffer.alloc(size);
    for (let i = 0; i < size; i += 1024) {
      largeBuf.writeUInt32BE(i, i);
    }

    const encrypted = applyStreamCipher(largeBuf, 1024);
    const decrypted = applyStreamCipher(encrypted, 1024);

    expect(decrypted.equals(largeBuf)).toBe(true);
  });
});
