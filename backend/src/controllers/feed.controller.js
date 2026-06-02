import { getSmartFeedFor } from "../lib/localStore.js";

function sendError(res, error) {
  res.status(error.status || 500).json({ message: error.message || "Internal server error" });
}

const modeForPath = {
  "/for-you": "for_you",
  "/following": "following",
  "/language": "language",
  "/trending": "trending",
  "/discover": "discover",
};

export async function getFeed(req, res) {
  try {
    const mode = modeForPath[req.route.path] || "for_you";
    const feed = await getSmartFeedFor(req.user.id, mode, req.query);
    res.status(200).json(feed);
  } catch (error) {
    sendError(res, error);
  }
}
