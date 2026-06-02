import { env } from "../../config/env.js";

function normalizeJamendoItem(item = {}) {
  if (!item.id || !item.name || !item.artist_name || !item.audio) return null;

  return {
    provider: "jamendo",
    providerId: String(item.id),
    title: item.name,
    artist: item.artist_name,
    album: item.album_name || "",
    artworkUrl: item.album_image || item.image || "",
    previewUrl: item.audio,
    sourceUrl: item.shareurl || "",
    explicit: false,
    durationMs: Number(item.duration || 30) * 1000,
  };
}

export async function searchJamendoMusic(query, limit = env.MUSIC_SEARCH_LIMIT) {
  if (!env.JAMENDO_CLIENT_ID) return [];

  const url = new URL("https://api.jamendo.com/v3.0/tracks/");
  url.searchParams.set("client_id", env.JAMENDO_CLIENT_ID);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("audioformat", "mp32");
  url.searchParams.set("namesearch", query);

  const response = await fetch(url);
  if (!response.ok) {
    throw Object.assign(new Error("Jamendo music provider is unavailable."), { status: 502 });
  }

  const data = await response.json();
  return (data.results || []).map(normalizeJamendoItem).filter(Boolean);
}
