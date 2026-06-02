import { env } from "../../config/env.js";

function normalizeItunesItem(item = {}) {
  const previewUrl = item.previewUrl || "";
  const sourceUrl = item.trackViewUrl || item.collectionViewUrl || "";

  if (!item.trackId || !item.trackName || !item.artistName || !previewUrl) {
    return null;
  }

  return {
    provider: "itunes",
    providerId: String(item.trackId),
    title: item.trackName,
    artist: item.artistName,
    album: item.collectionName || "",
    artworkUrl: (item.artworkUrl100 || "").replace("100x100bb", "300x300bb"),
    previewUrl,
    sourceUrl,
    explicit: item.trackExplicitness === "explicit" || item.collectionExplicitness === "explicit",
    durationMs: Number(item.previewDurationMs || 30000),
  };
}

export async function searchItunesMusic(query, limit = env.MUSIC_SEARCH_LIMIT) {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", query);
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("explicit", env.MUSIC_ALLOW_EXPLICIT ? "Yes" : "No");

  const response = await fetch(url);
  if (!response.ok) {
    throw Object.assign(new Error("Music provider is unavailable."), { status: 502 });
  }

  const data = await response.json();
  return (data.results || [])
    .map(normalizeItunesItem)
    .filter(Boolean)
    .filter((item) => env.MUSIC_ALLOW_EXPLICIT || !item.explicit);
}
