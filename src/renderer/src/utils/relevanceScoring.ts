import { VideoRecord, PlaylistRecord } from "../env";
import { parseTag } from "./tagColors";

export interface RelevanceContext {
  searchQuery?: string;
  selectedTags?: string[];
  playlists?: PlaylistRecord[];
  allVideos?: VideoRecord[];
}

/**
 * Category importance weights for tag matching.
 * Specific metadata (Series, Director) provides stronger recommendation signal than general tags.
 */
const CATEGORY_WEIGHTS: Record<string, number> = {
  Series: 1.6,
  Franchise: 1.5,
  Director: 1.4,
  Actor: 1.3,
  Genre: 1.2,
  Mood: 1.1,
  General: 0.9,
};

function getCategoryWeight(category: string): number {
  return CATEGORY_WEIGHTS[category] || 1.0;
}

/**
 * Computes Dice-Sørensen token overlap coefficient between two strings.
 */
function computeTokenOverlap(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const clean1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const clean2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();

  const tokens1 = new Set(clean1.split(/\s+/).filter((t) => t.length > 2));
  const tokens2 = new Set(clean2.split(/\s+/).filter((t) => t.length > 2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t)) intersection++;
  });

  return (2 * intersection) / (tokens1.size + tokens2.size);
}

/**
 * Computes weighted Jaccard tag similarity between candidate video tags and target tags.
 */
function computeWeightedTagJaccard(
  videoTags: string[],
  targetTags: string[],
): number {
  if (!videoTags.length || !targetTags.length) return 0;

  const targetSet = new Set(targetTags);
  let intersectionWeight = 0;
  let unionWeight = 0;

  const allUniqueTags = new Set([...videoTags, ...targetTags]);

  allUniqueTags.forEach((t) => {
    const { category } = parseTag(t);
    const weight = getCategoryWeight(category);
    const inVideo = videoTags.includes(t);
    const inTarget = targetSet.has(t);

    if (inVideo && inTarget) {
      intersectionWeight += weight;
    }
    if (inVideo || inTarget) {
      unionWeight += weight;
    }
  });

  return unionWeight > 0 ? intersectionWeight / unionWeight : 0;
}

/**
 * Calculates a multidimensional relevance recommendation score for a single video.
 */
export function calculateRelevanceScore(
  video: VideoRecord,
  context: RelevanceContext | PlaylistRecord[] = {},
): number {
  const normalizedContext: RelevanceContext = Array.isArray(context)
    ? { playlists: context }
    : context;

  const {
    searchQuery = "",
    selectedTags = [],
    playlists = [],
    allVideos = [],
  } = normalizedContext;

  let score = 1.0;

  // 1. Direct Search Term Match & Token Overlap
  if (searchQuery.trim()) {
    const query = searchQuery.trim();
    if (query.startsWith("#")) {
      const tagQuery = query.slice(1).toLowerCase();
      const hasExactTag = video.tags.some((t) => t.toLowerCase() === tagQuery);
      if (hasExactTag) {
        score += 8.0;
      } else {
        const hasPartialTag = video.tags.some((t) =>
          t.toLowerCase().includes(tagQuery),
        );
        if (hasPartialTag) score += 4.0;
      }
    } else {
      const titleOverlap = computeTokenOverlap(video.title, query);
      score += titleOverlap * 6.0;

      const tagText = video.tags.map((t) => t.replace(":", " ")).join(" ");
      const tagOverlap = computeTokenOverlap(tagText, query);
      score += tagOverlap * 4.0;
    }
  }

  // 2. Selected Filter Tags Relevance
  if (selectedTags.length > 0) {
    const jaccard = computeWeightedTagJaccard(video.tags, selectedTags);
    score += jaccard * 5.0;
  }

  // 3. User Historical Preference Affinity (Content-Based Collaborative Signal)
  if (allVideos.length > 0) {
    const highlyPlayed = allVideos.filter(
      (v) => (v.playCount || 0) >= 2 && v.id !== video.id,
    );

    if (highlyPlayed.length > 0) {
      let maxHistoryAffinity = 0;
      for (const played of highlyPlayed) {
        const tagSim = computeWeightedTagJaccard(video.tags, played.tags);
        const titleSim = computeTokenOverlap(video.title, played.title);
        const sim = tagSim * 0.7 + titleSim * 0.3;
        if (sim > maxHistoryAffinity) {
          maxHistoryAffinity = sim;
        }
      }

      score += maxHistoryAffinity * 2.5;
    }
  }

  // 4. Logarithmic Play Count Boost (Implicit Feedback)
  const playBoost = Math.log2(2 + (video.playCount || 0));
  score *= playBoost;

  // 5. Playlist Curation Boost
  const favPlaylist = playlists.find((p) => p.id === "favourite");
  if (favPlaylist && favPlaylist.videoIds.includes(video.id)) {
    score *= 1.35; // +35% boost for user favorites
  }

  const watchLaterPlaylist = playlists.find((p) => p.id === "watch_later");
  if (watchLaterPlaylist && watchLaterPlaylist.videoIds.includes(video.id)) {
    score *= 1.25; // +25% boost for items in watch later
  }

  // 6. Recency / Freshness Time Decay
  if (video.lastWatchedAt) {
    const lastWatchedTime = new Date(video.lastWatchedAt).getTime();
    const now = Date.now();
    const daysSinceWatched = Math.max(0, (now - lastWatchedTime) / (1000 * 60 * 60 * 24));
    // Half life of 14 days
    const timeDecay = Math.pow(2, -daysSinceWatched / 14);
    score *= 0.85 + 0.15 * timeDecay;
  }

  return score;
}

/**
 * Sorts an array of videos by relevance score using the hybrid recommendation algorithm.
 */
export function sortVideosByRelevance(
  videos: VideoRecord[],
  context: RelevanceContext | PlaylistRecord[] = {},
): VideoRecord[] {
  const scored = videos.map((video) => ({
    video,
    score: calculateRelevanceScore(video, context),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.map((item) => item.video);
}
