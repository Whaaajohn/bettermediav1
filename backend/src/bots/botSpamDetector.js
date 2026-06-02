const recentUserTexts = new Map();

export function detectSpamForUser(userId, text = "") {
  if (!userId || !text.trim()) return { spam: false, score: 0 };
  const now = Date.now();
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const history = (recentUserTexts.get(userId) || []).filter((item) => now - item.at < 10 * 60 * 1000);
  history.unshift({ text: normalized, at: now });
  recentUserTexts.set(userId, history.slice(0, 30));

  const repeats = history.filter((item) => item.text === normalized).length;
  const linkCount = (normalized.match(/https?:\/\//g) || []).length;
  const hashtagCount = (normalized.match(/#[a-z0-9_]+/g) || []).length;
  const score = repeats * 25 + linkCount * 15 + Math.max(0, hashtagCount - 8) * 8;

  return {
    spam: score >= 60,
    score,
    repeats,
    linkCount,
    hashtagCount,
  };
}
