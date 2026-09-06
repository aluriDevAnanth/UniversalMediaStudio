/**
 * Buffer & Network Quality Monitor for HTML5 Video Playback
 */
export interface BufferHealthStats {
  bufferAheadSec: number;
  bufferPercent: number;
  health: "excellent" | "good" | "fair" | "poor";
  estimatedMbps: number;
  stalls: number;
  totalStallDurationMs: number;
}

export class BufferHealthMonitor {
  private videoEl: HTMLVideoElement | null = null;
  private stallCount = 0;
  private totalStallDurationMs = 0;
  private stallStartTime: number | null = null;
  private lastSampleTime = Date.now();
  private lastBufferedEnd = 0;
  private currentSpeedMbps = 0;

  public attach(video: HTMLVideoElement) {
    this.videoEl = video;
    this.stallCount = 0;
    this.totalStallDurationMs = 0;
    this.stallStartTime = null;
    this.lastSampleTime = Date.now();
    this.lastBufferedEnd = 0;

    video.addEventListener("waiting", this.onWaiting);
    video.addEventListener("playing", this.onPlaying);
    video.addEventListener("progress", this.onProgress);
  }

  public detach() {
    if (this.videoEl) {
      this.videoEl.removeEventListener("waiting", this.onWaiting);
      this.videoEl.removeEventListener("playing", this.onPlaying);
      this.videoEl.removeEventListener("progress", this.onProgress);
      this.videoEl = null;
    }
  }

  private onWaiting = () => {
    this.stallCount++;
    this.stallStartTime = Date.now();
  };

  private onPlaying = () => {
    if (this.stallStartTime) {
      this.totalStallDurationMs += Date.now() - this.stallStartTime;
      this.stallStartTime = null;
    }
  };

  private onProgress = () => {
    if (!this.videoEl) return;
    const now = Date.now();
    const timeDeltaSec = (now - this.lastSampleTime) / 1000;
    if (timeDeltaSec < 0.5) return;

    const buffered = this.videoEl.buffered;
    if (buffered.length > 0) {
      const currentEnd = buffered.end(buffered.length - 1);
      const bufferedDeltaSec = Math.max(0, currentEnd - this.lastBufferedEnd);
      this.lastBufferedEnd = currentEnd;
      this.lastSampleTime = now;

      // Approximate bitrate download rate
      const estBitrateBps = 4_000_000; // ~4Mbps baseline
      const downloadedBits = bufferedDeltaSec * estBitrateBps;
      this.currentSpeedMbps = parseFloat(
        ((downloadedBits / timeDeltaSec) / 1_000_000).toFixed(2),
      );
    }
  };

  public getStats(): BufferHealthStats {
    if (!this.videoEl) {
      return {
        bufferAheadSec: 0,
        bufferPercent: 0,
        health: "poor",
        estimatedMbps: 0,
        stalls: 0,
        totalStallDurationMs: 0,
      };
    }

    const currentTime = this.videoEl.currentTime || 0;
    const buffered = this.videoEl.buffered;

    let bufferAheadSec = 0;
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
        bufferAheadSec = Math.max(0, buffered.end(i) - currentTime);
        break;
      }
    }

    const bufferPercent = Math.min(100, Math.round((bufferAheadSec / 30) * 100));

    let health: BufferHealthStats["health"] = "poor";
    if (bufferAheadSec >= 15) {
      health = "excellent";
    } else if (bufferAheadSec >= 6) {
      health = "good";
    } else if (bufferAheadSec >= 2) {
      health = "fair";
    } else {
      health = "poor";
    }

    return {
      bufferAheadSec: parseFloat(bufferAheadSec.toFixed(1)),
      bufferPercent,
      health,
      estimatedMbps: this.currentSpeedMbps || (health === "excellent" ? 25 : health === "good" ? 15 : 5),
      stalls: this.stallCount,
      totalStallDurationMs: this.totalStallDurationMs,
    };
  }
}
