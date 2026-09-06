import fs from "fs";
import { BundleManager } from "./bundle_manager";

export interface CachedSegment {
  data: Buffer;
  size: number;
  lastAccess: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CachedSegment>();
  private currentSizeBytes = 0;
  // Maximum 256MB in-memory segment cache for instant seeks
  private static readonly MAX_CACHE_BYTES = 256 * 1024 * 1024;
  private activePrefetches = new Set<string>();

  public static getInstance(): CacheManager {
    if (!this.instance) {
      this.instance = new CacheManager();
    }
    return this.instance;
  }

  private makeKey(bundlePath: string, assetKey: string, start: number, end: number): string {
    return `${bundlePath}:${assetKey}:${start}:${end}`;
  }

  public get(bundlePath: string, assetKey: string, start: number, end: number): Buffer | null {
    const key = this.makeKey(bundlePath, assetKey, start, end);
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.data;
    }
    return null;
  }

  public set(bundlePath: string, assetKey: string, start: number, end: number, data: Buffer): void {
    const key = this.makeKey(bundlePath, assetKey, start, end);
    const size = data.length;

    // Evict oldest entries if capacity exceeded
    while (this.currentSizeBytes + size > CacheManager.MAX_CACHE_BYTES && this.cache.size > 0) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [k, v] of this.cache.entries()) {
        if (v.lastAccess < oldestTime) {
          oldestTime = v.lastAccess;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        const evicted = this.cache.get(oldestKey);
        if (evicted) {
          this.currentSizeBytes -= evicted.size;
          this.cache.delete(oldestKey);
        }
      } else {
        break;
      }
    }

    this.cache.set(key, { data, size, lastAccess: Date.now() });
    this.currentSizeBytes += size;
  }

  public clear(): void {
    this.cache.clear();
    this.currentSizeBytes = 0;
  }

  /**
   * Asynchronously prefetches a video segment into LRU memory in the background
   */
  public async prefetchSegment(
    bundlePath: string,
    assetKey: string,
    startByte: number,
    endByte: number,
    payloadStartOffset: number,
    assetOffset: number,
  ): Promise<void> {
    const key = this.makeKey(bundlePath, assetKey, startByte, endByte);
    if (this.cache.has(key) || this.activePrefetches.has(key)) return;

    this.activePrefetches.add(key);
    try {
      const length = endByte - startByte + 1;
      if (length <= 0 || length > 16 * 1024 * 1024) return; // Cap prefetch to 16MB

      const assetStartInFile = payloadStartOffset + assetOffset;
      const fd = await fs.promises.open(bundlePath, "r");
      try {
        const rawBuf = Buffer.alloc(length);
        await fd.read(rawBuf, 0, length, assetStartInFile + startByte);
        const demasked = BundleManager.applyStreamCipherMask(rawBuf, assetOffset + startByte);
        this.set(bundlePath, assetKey, startByte, endByte, demasked);
      } finally {
        await fd.close();
      }
    } catch {
      // Ignore background prefetch errors
    } finally {
      this.activePrefetches.delete(key);
    }
  }
}
