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

function tokenize(str: string): Set<string> {
  if (!str) return new Set();
  const clean = str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  if (!clean) return new Set();
  const words = clean.split(/\s+/);
  const result = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    if (words[i].length > 2) {
      result.add(words[i]);
    }
  }
  return result;
}

/**
 * Computes Dice-Sørensen token overlap coefficient between two strings or pre-tokenized sets.
 */
function computeTokenOverlap(str1: string, str2: string | Set<string>): number {
  if (!str1 || !str2) return 0;
  const tokens1 = tokenize(str1);
  const tokens2 = str2 instanceof Set ? str2 : tokenize(str2);

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }

  return (2 * intersection) / (tokens1.size + tokens2.size);
}

/**
 * Computes weighted Jaccard tag similarity between candidate video tags and target tags.
 */
function computeWeightedTagJaccard(
  videoTags: string[],
  targetTags: string[] | Set<string>,
): number {
  if (!videoTags.length) return 0;
  const targetSet = targetTags instanceof Set ? targetTags : new Set(targetTags);
  if (targetSet.size === 0) return 0;

  let intersectionWeight = 0;
  let unionWeight = 0;

  for (let i = 0; i < videoTags.length; i++) {
    const t = videoTags[i];
    const { category } = parseTag(t);
    const weight = getCategoryWeight(category);
    unionWeight += weight;
    if (targetSet.has(t)) {
      intersectionWeight += weight;
    }
  }

  for (const t of targetSet) {
    if (!videoTags.includes(t)) {
      const { category } = parseTag(t);
      unionWeight += getCategoryWeight(category);
    }
  }

  return unionWeight > 0 ? intersectionWeight / unionWeight : 0;
}

interface CompiledContext {
  searchQuery: string;
  isTagQuery: boolean;
  tagQuery: string;
  queryTokens: Set<string>;
  selectedTagsSet: Set<string>;
  hasSelectedTags: boolean;
  favoriteVideoIds: Set<string>;
  watchLaterVideoIds: Set<string>;
  highlyPlayed: VideoRecord[];
}

function compileContext(context: RelevanceContext | PlaylistRecord[] = {}): CompiledContext {
  const normalized: RelevanceContext = Array.isArray(context)
    ? { playlists: context }
    : context;

  const {
    searchQuery = "",
    selectedTags = [],
    playlists = [],
    allVideos = [],
  } = normalized;

  const trimmedQuery = searchQuery.trim();
  const isTagQuery = trimmedQuery.startsWith("#");
  const tagQuery = isTagQuery ? trimmedQuery.slice(1).toLowerCase() : "";
  const queryTokens = isTagQuery ? new Set<string>() : tokenize(trimmedQuery);

  const selectedTagsSet = new Set(selectedTags);
  const hasSelectedTags = selectedTagsSet.size > 0;

  const favPlaylist = playlists.find((p) => p.id === "favourite");
  const favoriteVideoIds = new Set(favPlaylist?.videoIds || []);

  const watchLaterPlaylist = playlists.find((p) => p.id === "watch_later");
  const watchLaterVideoIds = new Set(watchLaterPlaylist?.videoIds || []);

  const highlyPlayed = allVideos.filter((v) => (v.playCount || 0) >= 2);

  return {
    searchQuery: trimmedQuery,
    isTagQuery,
    tagQuery,
    queryTokens,
    selectedTagsSet,
    hasSelectedTags,
    favoriteVideoIds,
    watchLaterVideoIds,
    highlyPlayed,
  };
}

function calculateScoreWithCompiledContext(
  video: VideoRecord,
  ctx: CompiledContext,
): number {
  let score = 1.0;

  // 1. Direct Search Term Match & Token Overlap
  if (ctx.searchQuery) {
    if (ctx.isTagQuery) {
      const hasExactTag = video.tags.some((t) => t.toLowerCase() === ctx.tagQuery);
      if (hasExactTag) {
        score += 8.0;
      } else {
        const hasPartialTag = video.tags.some((t) =>
          t.toLowerCase().includes(ctx.tagQuery),
        );
        if (hasPartialTag) score += 4.0;
      }
    } else {
      const titleOverlap = computeTokenOverlap(video.title, ctx.queryTokens);
      score += titleOverlap * 6.0;

      const tagText = video.tags.map((t) => t.replace(":", " ")).join(" ");
      const tagOverlap = computeTokenOverlap(tagText, ctx.queryTokens);
      score += tagOverlap * 4.0;
    }
  }

  // 2. Selected Filter Tags Relevance
  if (ctx.hasSelectedTags) {
    const jaccard = computeWeightedTagJaccard(video.tags, ctx.selectedTagsSet);
    score += jaccard * 5.0;
  }

  // 3. User Historical Preference Affinity (Content-Based Collaborative Signal)
  if (ctx.highlyPlayed.length > 0) {
    let maxHistoryAffinity = 0;
    for (let i = 0; i < ctx.highlyPlayed.length; i++) {
      const played = ctx.highlyPlayed[i];
      if (played.id === video.id) continue;
      const tagSim = computeWeightedTagJaccard(video.tags, played.tags);
      const titleSim = computeTokenOverlap(video.title, played.title);
      const sim = tagSim * 0.7 + titleSim * 0.3;
      if (sim > maxHistoryAffinity) {
        maxHistoryAffinity = sim;
      }
    }
    score += maxHistoryAffinity * 2.5;
  }

  // 4. Logarithmic Play Count Boost (Implicit Feedback)
  const playBoost = Math.log2(2 + (video.playCount || 0));
  score *= playBoost;

  // 5. Playlist Curation Boost
  if (ctx.favoriteVideoIds.has(video.id)) {
    score *= 1.35; // +35% boost for user favorites
  }

  if (ctx.watchLaterVideoIds.has(video.id)) {
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
 * Calculates a multidimensional relevance recommendation score for a single video.
 */
export function calculateRelevanceScore(
  video: VideoRecord,
  context: RelevanceContext | PlaylistRecord[] = {},
): number {
  const compiled = compileContext(context);
  return calculateScoreWithCompiledContext(video, compiled);
}

/**
 * Sorts an array of videos by relevance score using the hybrid recommendation algorithm.
 */
export function sortVideosByRelevance(
  videos: VideoRecord[],
  context: RelevanceContext | PlaylistRecord[] = {},
): VideoRecord[] {
  const compiled = compileContext(context);
  const scored = videos.map((video) => ({
    video,
    score: calculateScoreWithCompiledContext(video, compiled),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.map((item) => item.video);
}
