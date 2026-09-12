import { describe, it, expect } from "bun:test";
import { parseRangeHeader, registerAdaumcProtocol } from "../src/main/protocol";

describe("HTTP RFC 7233 Range Streaming & Adaumc Protocol (src/main/protocol.ts)", () => {
  const TOTAL_SIZE = 10000; // 10,000 bytes (0 to 9999)

  it("should parse standard closed byte ranges accurately", () => {
    const parsed = parseRangeHeader("bytes=0-499", TOTAL_SIZE);
    expect(parsed).not.toBeNull();
    expect(parsed!.start).toBe(0);
    expect(parsed!.end).toBe(499);
    expect(parsed!.contentLength).toBe(500);
    expect(parsed!.isSatisfiable).toBe(true);
  });

  it("should parse open-ended byte ranges to the end of file", () => {
    const parsed = parseRangeHeader("bytes=5000-", TOTAL_SIZE);
    expect(parsed).not.toBeNull();
    expect(parsed!.start).toBe(5000);
    expect(parsed!.end).toBe(9999);
    expect(parsed!.contentLength).toBe(5000);
    expect(parsed!.isSatisfiable).toBe(true);
  });

  it("should parse suffix byte ranges (reading last N bytes)", () => {
    const parsed = parseRangeHeader("bytes=-1500", TOTAL_SIZE);
    expect(parsed).not.toBeNull();
    expect(parsed!.start).toBe(8500);
    expect(parsed!.end).toBe(9999);
    expect(parsed!.contentLength).toBe(1500);
    expect(parsed!.isSatisfiable).toBe(true);
  });

  it("should clamp suffix range to 0 if suffix length exceeds total size", () => {
    const parsed = parseRangeHeader("bytes=-20000", TOTAL_SIZE);
    expect(parsed).not.toBeNull();
    expect(parsed!.start).toBe(0);
    expect(parsed!.end).toBe(9999);
    expect(parsed!.contentLength).toBe(10000);
    expect(parsed!.isSatisfiable).toBe(true);
  });

  it("should clamp end offset to totalSize - 1 if requested range extends beyond EOF", () => {
    const parsed = parseRangeHeader("bytes=8000-50000", TOTAL_SIZE);
    expect(parsed).not.toBeNull();
    expect(parsed!.start).toBe(8000);
    expect(parsed!.end).toBe(9999);
    expect(parsed!.contentLength).toBe(2000);
    expect(parsed!.isSatisfiable).toBe(true);
  });

  it("should handle multi-range comma-separated headers by parsing the first range", () => {
    const parsed = parseRangeHeader("bytes=0-100, 200-300, 400-500", TOTAL_SIZE);
    expect(parsed).not.toBeNull();
    expect(parsed!.start).toBe(0);
    expect(parsed!.end).toBe(100);
    expect(parsed!.contentLength).toBe(101);
  });

  it("should detect unsatisfiable ranges where start >= totalSize", () => {
    const parsed = parseRangeHeader("bytes=15000-20000", TOTAL_SIZE);
    expect(parsed).not.toBeNull();
    expect(parsed!.isSatisfiable).toBe(false);
    expect(parsed!.contentLength).toBe(0);
  });

  it("should return null for malformed or non-byte range headers", () => {
    expect(parseRangeHeader(null, TOTAL_SIZE)).toBeNull();
    expect(parseRangeHeader(undefined, TOTAL_SIZE)).toBeNull();
    expect(parseRangeHeader("", TOTAL_SIZE)).toBeNull();
    expect(parseRangeHeader("items=0-10", TOTAL_SIZE)).toBeNull();
    expect(parseRangeHeader("bytes=", TOTAL_SIZE)).toBeNull();
    expect(parseRangeHeader("bytes=abc-def", TOTAL_SIZE)).toBeNull();
    expect(parseRangeHeader("bytes=500-200", TOTAL_SIZE)).toBeNull(); // start > end
    expect(parseRangeHeader("bytes=-abc", TOTAL_SIZE)).toBeNull();
  });

  it("should execute registerAdaumcProtocol without throwing in any environment", () => {
    expect(() => registerAdaumcProtocol()).not.toThrow();
  });
});
