import { getMusicProviders, getTrendingMusic, searchMusic } from "../services/music.service.js";

function sendError(res, error, fallback = "Music request failed") {
  res.status(error.status || 500).json({
    message: error.message || fallback,
    code: error.code || "MUSIC_ERROR",
    items: [],
  });
}

export async function providers(req, res) {
  res.status(200).json(getMusicProviders());
}

export async function search(req, res) {
  try {
    const result = await searchMusic({
      q: req.query.q || "",
      provider: req.query.provider || undefined,
      limit: req.query.limit || undefined,
    });
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function trending(req, res) {
  try {
    const result = await getTrendingMusic({
      limit: req.query.limit || undefined,
    });
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}
