import fs from "fs";
import { DBData } from "./types";

export class AnalyticsRepository {
  constructor(private data: DBData) {}

  public getAnalytics() {
    const videos = Object.values(this.data.videos);
    const totalPlayCount = videos.reduce(
      (sum, v) => sum + (v.playCount || 0),
      0,
    );
    const totalStorageBytes = videos.reduce((sum, v) => {
      if (fs.existsSync(v.bundlePath)) {
        return sum + fs.statSync(v.bundlePath).size;
      }
      return sum;
    }, 0);

    const tagCounts: Record<string, number> = {};
    for (const v of videos) {
      for (const t of v.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }

    return {
      totalVideos: videos.length,
      totalPlayCount,
      totalStorageBytes,
      tagDistribution: tagCounts,
      analyticsData: this.data.analytics,
    };
  }
}
