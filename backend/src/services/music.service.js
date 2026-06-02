import { env } from "../config/env.js";
import { searchItunesMusic } from "../providers/music/itunes.provider.js";
import { searchJamendoMusic } from "../providers/music/jamendo.provider.js";

const cache = new Map();

function clampLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) return env.MUSIC_SEARCH_LIMIT;
  return Math.max(1, Math.min(parsed, env.MUSIC_SEARCH_LIMIT, 50));
}

function cacheKey(provider, query, limit) {
  return `${provider}:${query.toLowerCase()}:${limit}`;
}

function cached(key) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + env.MUSIC_CACHE_TTL_MS,
  });
}

function safeUrl(value = "") {
  try {
    const url = new URL(String(value || ""));
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function textLimit(value = "", max = 160) {
  return String(value || "").trim().slice(0, max);
}

export function sanitizeSongAttachment(song = null) {
  if (!song) return null;

  const provider = textLimit(song.provider, 40).toLowerCase();
  const providerId = textLimit(song.providerId, 100);
  const title = textLimit(song.title, 160);
  const artist = textLimit(song.artist, 160);
  const previewUrl = safeUrl(song.previewUrl);

  if (!provider || !providerId || !title || !artist || !previewUrl) {
    const error = new Error("Selected song is missing required preview metadata.");
    error.status = 400;
    throw error;
  }

  const explicit = Boolean(song.explicit);
  if (explicit && !env.MUSIC_ALLOW_EXPLICIT) {
    const error = new Error("Explicit songs are not available on BetterMedia right now.");
    error.status = 400;
    throw error;
  }

  return {
    provider,
    providerId,
    title,
    artist,
    album: textLimit(song.album, 160),
    artworkUrl: safeUrl(song.artworkUrl),
    previewUrl,
    sourceUrl: safeUrl(song.sourceUrl),
    explicit,
    durationMs: Math.max(0, Math.min(Number(song.durationMs) || 30000, 10 * 60 * 1000)),
  };
}

function sanitizeSongResult(song) {
  try {
    return sanitizeSongAttachment(song);
  } catch {
    return null;
  }
}

export function getMusicProviders() {
  return {
    enabled: env.MUSIC_ENABLED,
    defaultProvider: env.MUSIC_PROVIDER,
    providers: [
      {
        id: "itunes",
        name: "iTunes Search",
        enabled: env.MUSIC_ENABLED,
        requiresKey: false,
      },
      {
        id: "jamendo",
        name: "Jamendo",
        enabled: env.MUSIC_ENABLED && Boolean(env.JAMENDO_CLIENT_ID),
        requiresKey: true,
      },
    ],
  };
}

export async function searchMusic({ q = "", provider = env.MUSIC_PROVIDER, limit = env.MUSIC_SEARCH_LIMIT } = {}) {
  if (!env.MUSIC_ENABLED) return { items: [], provider, disabled: true };

  const query = String(q || "").trim();
  if (query.length < 2) return { items: [], provider };

  const safeLimit = clampLimit(limit);
  const selectedProvider = ["itunes", "jamendo"].includes(String(provider).toLowerCase())
    ? String(provider).toLowerCase()
    : env.MUSIC_PROVIDER;
  const key = cacheKey(selectedProvider, query, safeLimit);
  const hit = cached(key);
  if (hit) return hit;

  let items = [];
  if (selectedProvider === "jamendo") {
    items = await searchJamendoMusic(query, safeLimit);
  } else {
    items = await searchItunesMusic(query, safeLimit);
  }

  const result = {
    items: items.map(sanitizeSongResult).filter(Boolean),
    provider: selectedProvider,
  };
  setCached(key, result);
  return result;
}

export async function getTrendingMusic({ limit = env.MUSIC_SEARCH_LIMIT } = {}) {
  const fallbackQuery = "global hits";
  return searchMusic({ q: fallbackQuery, provider: env.MUSIC_PROVIDER, limit });
}
