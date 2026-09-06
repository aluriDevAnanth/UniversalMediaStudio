import { Video, UserContext, WatchHistoryEntry, RecommendationResult } from "./types";

export interface UserProfile {
  videoPreferences: Map<string, number>; // videoId -> preference score
  categoryPreferences: Map<string, number>; // category -> score
  tagPreferences: Map<string, number>; // tag -> score
  watchPatterns: {
    averageDuration: number;
    completionRate: number;
    preferredLength: "short" | "medium" | "long";
  };
}

export class CollaborativeRecommender {
  private userProfile: UserProfile;

  constructor(context: UserContext) {
    this.userProfile = this.buildUserProfile(context);
  }

  /**
   * Build user profile from watch history, library play counts, and playlists
   */
  private buildUserProfile(context: UserContext): UserProfile {
    const profile: UserProfile = {
      videoPreferences: new Map(),
      categoryPreferences: new Map(),
      tagPreferences: new Map(),
      watchPatterns: {
        averageDuration: 0,
        completionRate: 0,
        preferredLength: "medium",
      },
    };

    // 1. Analyze watch history & play counts
    const history = context.watchHistory || [];
    let totalDuration = 0;
    let completedCount = 0;

    history.forEach((entry) => {
      const video = context.allVideos.find((v) => v.id === entry.videoId);
      if (!video) return;

      const completionScore = entry.completed
        ? 1.0
        : Math.min(1.0, entry.watchDuration / (video.duration || 300));
      const recencyBoost = this.calculateRecencyBoost(entry.timestamp);
      const engagementScore = this.calculateEngagementScore(entry);

      const totalScore = completionScore * 0.5 + engagementScore * 0.3 + recencyBoost * 0.2;
      profile.videoPreferences.set(video.id, totalScore);

      // Update category & tag preferences
      (video.tags || []).forEach((tag) => {
        const category = tag.split(":")[0];
        const currentCatScore = profile.categoryPreferences.get(category) || 0;
        profile.categoryPreferences.set(category, currentCatScore + totalScore);

        const currentTagScore = profile.tagPreferences.get(tag) || 0;
        profile.tagPreferences.set(tag, currentTagScore + totalScore);
      });

      totalDuration += entry.watchDuration;
      if (entry.completed) completedCount++;
    });

    // Also analyze play counts from video records (implicit signals)
    context.allVideos.forEach((video) => {
      if ((video.playCount || 0) > 0) {
        const implicitScore = Math.log2(1 + (video.playCount || 0)) * 0.8;
        const currentScore = profile.videoPreferences.get(video.id) || 0;
        profile.videoPreferences.set(video.id, Math.max(currentScore, implicitScore));

        (video.tags || []).forEach((tag) => {
          const category = tag.split(":")[0];
          const curCat = profile.categoryPreferences.get(category) || 0;
          profile.categoryPreferences.set(category, curCat + implicitScore * 0.5);

          const curTag = profile.tagPreferences.get(tag) || 0;
          profile.tagPreferences.set(tag, curTag + implicitScore * 0.7);
        });
      }
    });

    // 2. Analyze playlist engagement
    if (context.playlists) {
      if (context.playlists.favourite) {
        this.processPlaylistPreference(context.playlists.favourite, context, profile, 2.5);
      }
      if (context.playlists.watch_later) {
        this.processPlaylistPreference(context.playlists.watch_later, context, profile, 1.8);
      }
      Object.entries(context.playlists).forEach(([key, list]) => {
        if (key !== "favourite" && key !== "watch_later" && Array.isArray(list)) {
          this.processPlaylistPreference(list, context, profile, 1.2);
        }
      });
    }

    // 3. Calculate watch pattern averages
    const count = history.length || 1;
    profile.watchPatterns.averageDuration = totalDuration / count;
    profile.watchPatterns.completionRate = completedCount / count;

    const avgDuration = profile.watchPatterns.averageDuration;
    profile.watchPatterns.preferredLength =
      avgDuration > 0 && avgDuration < 120
        ? "short"
        : avgDuration >= 600
        ? "long"
        : "medium";

    return profile;
  }

  private calculateRecencyBoost(timestamp: Date | string): number {
    const timeMs = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp.getTime();
    const hoursAgo = Math.max(0, (Date.now() - timeMs) / (1000 * 60 * 60));
    return Math.exp(-hoursAgo / 48); // Exponential decay over 48 hours
  }

  private calculateEngagementScore(entry: WatchHistoryEntry): number {
    const seekScore = Math.min((entry.seekCount || 0) / 10, 0.5);
    const durationScore = Math.min((entry.watchDuration || 0) / 300, 1.0);
    return durationScore * 0.7 + seekScore * 0.3;
  }

  private processPlaylistPreference(
    videoIds: string[],
    context: UserContext,
    profile: UserProfile,
    weight: number,
  ): void {
    videoIds.forEach((videoId) => {
      const video = context.allVideos.find((v) => v.id === videoId);
      if (!video) return;

      const currentScore = profile.videoPreferences.get(videoId) || 0;
      profile.videoPreferences.set(videoId, currentScore + weight);

      (video.tags || []).forEach((tag) => {
        const category = tag.split(":")[0];
        const curCat = profile.categoryPreferences.get(category) || 0;
        profile.categoryPreferences.set(category, curCat + weight * 0.6);

        const curTag = profile.tagPreferences.get(tag) || 0;
        profile.tagPreferences.set(tag, curTag + weight * 0.4);
      });
    });
  }

  public getRecommendations(
    allVideos: Video[],
    limit: number = 20,
  ): RecommendationResult[] {
    const scores: { video: Video; score: number; reasons: string[] }[] = [];

    for (const video of allVideos) {
      let similarityScore = 0;
      const reasons: string[] = [];

      // 1. Tag-based user affinity
      let tagMatchCount = 0;
      (video.tags || []).forEach((tag) => {
        const prefScore = this.userProfile.tagPreferences.get(tag) || 0;
        if (prefScore > 0.3) {
          similarityScore += prefScore * 0.5;
          tagMatchCount++;
          reasons.push(`Matches your interest in ${tag}`);
        }
      });

      // 2. Category similarity
      const videoCategories = new Set((video.tags || []).map((t) => t.split(":")[0]));
      let categoryScore = 0;
      videoCategories.forEach((category) => {
        const prefScore = this.userProfile.categoryPreferences.get(category) || 0;
        categoryScore += prefScore;
      });
      similarityScore += (categoryScore / (videoCategories.size || 1)) * 0.3;

      // 3. Length preference
      const videoLength = video.duration || 0;
      const prefLength = this.userProfile.watchPatterns.preferredLength;
      const lengthScore = this.matchLengthPreference(videoLength, prefLength);
      similarityScore += lengthScore * 0.2;

      // Deduct score if heavily watched already to favor new discovery
      const currentWatchedScore = this.userProfile.videoPreferences.get(video.id) || 0;
      if (currentWatchedScore > 2.0) {
        similarityScore *= 0.6; // Slight discovery penalty for already consumed videos
      }

      if (similarityScore > 0.15) {
        if (tagMatchCount > 0 && !reasons.includes("Matches your viewing preferences")) {
          reasons.unshift("Matches your viewing preferences");
        }
        scores.push({
          video,
          score: similarityScore,
          reasons: reasons.slice(0, 3),
        });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ video, score, reasons }) => ({
        video,
        score,
        reasons: reasons.length > 0 ? reasons : ["Recommended for you"],
        source: "collaborative",
      }));
  }

  private matchLengthPreference(
    videoLength: number,
    preference: "short" | "medium" | "long",
  ): number {
    const ranges = {
      short: { min: 0, max: 180 },
      medium: { min: 120, max: 600 },
      long: { min: 300, max: Infinity },
    };

    const range = ranges[preference];
    if (videoLength >= range.min && videoLength <= range.max) return 1.0;
    if (videoLength < range.min) return Math.max(0, 1 - (range.min - videoLength) / range.min);
    return Math.max(0, 1 - (videoLength - range.max) / (range.max + 300));
  }
}
