import { env } from "../config/env.js";

export function scorePostForUser({ post, author, user, followedIds = new Set(), seenPostIds = new Set(), rankIndex = 0 }) {
  const tags = post.finalTags || post.hashtags || [];
  const weights = user.algorithmProfile?.interestWeights || {};
  const negativeWeights = user.algorithmProfile?.negativeInterestWeights || {};
  const preferredLanguages = new Set(
    [
      user.learningLanguage,
      user.nativeLanguage,
      ...(user.learningLanguages || []),
      ...(user.algorithmProfile?.preferredLanguages || []),
    ]
      .filter(Boolean)
      .map((language) => language.toLowerCase())
  );

  const languageMatch = preferredLanguages.has(post.language) ? 1 : 0;
  const interestMatch = tags.reduce((total, tag) => total + (Number(weights[tag]) || 0) - (Number(negativeWeights[tag]) || 0), 0);
  const followingBoost = followedIds.has(post.author) ? 1 : 0;
  const friendshipBoost = user.friends?.includes(post.author) ? 1 : 0;
  const engagementQuality =
    (post.likeCount || post.likes?.length || 0) * 1 +
    (post.commentCount || post.comments?.length || 0) * 3 +
    (post.saveCount || post.saves?.length || 0) * 5 +
    (post.repostCount || 0) * 5 -
    (post.dislikeCount || post.dislikes?.length || 0) * 2;
  const ageHours = Math.max(1, (Date.now() - new Date(post.createdAt).getTime()) / 3600000);
  const freshnessBoost = Math.max(0, 36 - ageHours) / 36;
  const creatorQuality = author?.emailVerified ? 1 : 0.2;
  const hashtagMatch = tags.some((tag) => weights[tag]) ? 1 : 0;
  const reportPenalty = (post.reportCount || 0) * 4;
  const spamPenalty = (post.spamScore || 0) / 10;
  const alreadySeenPenalty = seenPostIds.has(post._id) ? 1 : 0;
  const explorationBoost = rankIndex % 9 === 0 ? env.EXPLORATION_PERCENT / 100 : 0;

  return (
    3.0 * languageMatch +
    2.5 * interestMatch +
    2.0 * followingBoost +
    1.7 * friendshipBoost +
    1.5 * engagementQuality +
    1.4 * freshnessBoost +
    1.3 * creatorQuality +
    1.1 * hashtagMatch +
    0.7 * explorationBoost -
    4.0 * reportPenalty -
    3.0 * spamPenalty -
    2.5 * alreadySeenPenalty
  );
}

export function paginate(items, page = 1, limit = env.DEFAULT_FEED_LIMIT) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || env.DEFAULT_FEED_LIMIT));
  const start = (safePage - 1) * safeLimit;
  return {
    page: safePage,
    limit: safeLimit,
    total: items.length,
    hasMore: start + safeLimit < items.length,
    items: items.slice(start, start + safeLimit),
  };
}
