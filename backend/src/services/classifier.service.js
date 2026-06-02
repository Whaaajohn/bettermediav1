import { env } from "../config/env.js";

export const CATEGORY_KEYWORDS = {
  gaming: [
    "game", "gaming", "gamer", "ps5", "xbox", "steam", "pc", "controller", "console", "roblox",
    "minecraft", "fortnite", "call of duty", "cod", "warzone", "gta", "gta 6", "valorant", "csgo",
    "cs2", "apex", "fifa", "ea fc", "2k", "nba 2k", "ranked", "lobby", "server", "fps",
    "battle royale", "keyboard", "mouse", "aim", "clips", "stream",
  ],
  memes: ["meme", "funny", "lol", "lmao", "bruh", "nah", "wild", "crazy", "cooked", "goofy", "troll", "roast", "joke", "relatable", "😂", "🤣", "💀", "😭"],
  coding: ["code", "coding", "programming", "javascript", "js", "node", "express", "react", "vite", "nextjs", "python", "flask", "django", "api", "backend", "frontend", "database", "mongodb", "redis", "socket.io", "github", "bug", "error", "terminal", "localhost", "npm", "server"],
  language_learning: ["spanish", "english", "french", "creole", "portuguese", "german", "japanese", "korean", "mandarin", "arabic", "learn", "practice", "translate", "grammar", "pronunciation", "vocabulary", "phrase", "fluent", "native speaker"],
  music: ["music", "song", "album", "rapper", "rap", "beat", "producer", "playlist", "spotify", "apple music", "artist", "lyrics", "studio", "mix", "master", "drill", "trap", "hip hop", "rnb"],
  sports: ["basketball", "nba", "football", "soccer", "nfl", "mlb", "ufc", "boxing", "goal", "touchdown", "dunk", "player", "team", "game day", "match", "tournament"],
  tech: ["ai", "artificial intelligence", "pc", "gpu", "cpu", "nvidia", "amd", "rtx", "software", "hardware", "phone", "iphone", "android", "macbook", "windows", "linux", "server", "cloud"],
  school: ["school", "homework", "class", "teacher", "exam", "test", "study", "student", "grade", "project", "essay", "assignment"],
  fitness: ["gym", "workout", "lifting", "cardio", "fitness", "push day", "pull day", "leg day", "protein", "running", "health"],
  food: ["food", "cooking", "recipe", "restaurant", "snack", "drink", "meal", "breakfast", "lunch", "dinner"],
  travel: ["travel", "trip", "flight", "airport", "hotel", "beach", "city", "country", "vacation"],
  fashion: ["fit", "outfit", "shoes", "sneakers", "hoodie", "shirt", "style", "fashion", "drip"],
  business: ["money", "business", "startup", "brand", "marketing", "sales", "customer", "income", "entrepreneur"],
  motivation: ["motivation", "discipline", "goals", "grind", "focus", "dream", "success", "routine"],
  news: ["breaking", "update", "news", "world", "politics", "government", "election", "economy"],
};

const SUBTOPICS = [
  "roblox", "gta", "gta6", "call_of_duty", "minecraft", "fortnite", "python", "javascript", "react",
  "node", "ai", "ps5", "pc", "iphone", "android", "spanish", "english", "creole",
];

export function normalizeHashtag(tag = "") {
  return tag
    .replace(/^#/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 40);
}

export function extractHashtags(text = "") {
  const matches = text.match(/#[a-zA-Z0-9_]{2,40}/g) || [];
  return normalizeHashtags(matches);
}

export function normalizeHashtags(tags = []) {
  const seen = new Set();
  return tags
    .map(normalizeHashtag)
    .filter((tag) => tag.length >= 2 && /^[a-z0-9_]+$/.test(tag))
    .filter((tag) => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    })
    .slice(0, env.MAX_HASHTAGS_PER_POST);
}

function detectTone(text = "") {
  if (/[😂🤣💀😭]/.test(text)) return "funny";
  if (/[!?]{2,}/.test(text)) return "excited";
  if (/\b(help|how do i|can someone|teach me)\b/i.test(text)) return "learning";
  return "neutral";
}

function detectLanguage(text = "", fallback = "english") {
  const lower = text.toLowerCase();
  if (/[¿¡ñáéíóú]/i.test(text) || /\b(hola|gracias|espanol|español|que|como)\b/.test(lower)) return "spanish";
  if (/\b(bonjour|merci|francais|français)\b/.test(lower)) return "french";
  if (/\b(creole|kreyol|sak pase)\b/.test(lower)) return "creole";
  return fallback || "english";
}

export function classifyPostText(text = "", options = {}) {
  const lower = text.toLowerCase();
  const selectedCategory = options.category?.toString().trim().toLowerCase();
  const userHashtags = normalizeHashtags([...(options.hashtags || []), ...extractHashtags(text)]);
  const detectedTags = [];

  userHashtags.forEach((tag) => {
    detectedTags.push({ name: tag, confidence: 0.9, source: "hashtag" });
  });

  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    keywords.forEach((keyword) => {
      if (lower.includes(keyword.toLowerCase())) {
        detectedTags.push({
          name: category,
          confidence: selectedCategory === category ? 0.98 : 0.78,
          source: "keyword",
        });
      }
    });
  });

  SUBTOPICS.forEach((topic) => {
    const textTopic = topic.replace(/_/g, " ");
    if (lower.includes(textTopic) || lower.includes(topic)) {
      detectedTags.push({ name: topic, confidence: 0.84, source: "subtopic" });
    }
  });

  if (selectedCategory && CATEGORY_KEYWORDS[selectedCategory]) {
    detectedTags.push({ name: selectedCategory, confidence: 0.95, source: "user" });
  }

  if (/[😂🤣💀😭]/.test(text)) {
    detectedTags.push({ name: "memes", confidence: 0.7, source: "emoji" });
  }

  const bestByTag = new Map();
  detectedTags.forEach((tag) => {
    const existing = bestByTag.get(tag.name);
    if (!existing || tag.confidence > existing.confidence) bestByTag.set(tag.name, tag);
  });

  const finalTags = [...bestByTag.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .map((tag) => tag.name)
    .slice(0, 15);

  const spamScore = Math.max(0, (userHashtags.length - 6) * 8 + (text.length > env.MAX_POST_LENGTH ? 30 : 0));

  return {
    hashtags: userHashtags,
    detectedTags: [...bestByTag.values()],
    finalTags,
    category: selectedCategory && CATEGORY_KEYWORDS[selectedCategory] ? selectedCategory : finalTags[0] || "general",
    subcategory: finalTags.find((tag) => SUBTOPICS.includes(tag)) || "",
    tone: detectTone(text),
    language: detectLanguage(text, options.fallbackLanguage),
    qualityScore: Math.max(0, 60 + Math.min(30, finalTags.length * 4) - spamScore),
    spamScore,
  };
}
