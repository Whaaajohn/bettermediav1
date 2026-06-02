import {
  getHashtagPageFor,
  getTrendingHashtagsFor,
  muteHashtagFor,
  recalculateAllHashtagsFor,
  recalculatePostHashtagsFor,
  searchHashtagsFor,
  unmuteHashtagFor,
} from "../lib/localStore.js";

function sendError(res, error) {
  res.status(error.status || 500).json({ message: error.message || "Internal server error" });
}

export async function getTrendingHashtags(req, res) {
  try {
    res.status(200).json(await getTrendingHashtagsFor(req.query));
  } catch (error) {
    sendError(res, error);
  }
}

export async function searchHashtags(req, res) {
  try {
    res.status(200).json(await searchHashtagsFor(req.query.q || ""));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getHashtag(req, res) {
  try {
    res.status(200).json(await getHashtagPageFor(req.user.id, req.params.tag, req.query));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getHashtagPosts(req, res) {
  return getHashtag(req, res);
}

export async function recalculatePostHashtags(req, res) {
  try {
    res.status(200).json(await recalculatePostHashtagsFor(req.user.id, req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function muteHashtag(req, res) {
  try {
    res.status(200).json(await muteHashtagFor(req.user.id, req.params.tag));
  } catch (error) {
    sendError(res, error);
  }
}

export async function unmuteHashtag(req, res) {
  try {
    res.status(200).json(await unmuteHashtagFor(req.user.id, req.params.tag));
  } catch (error) {
    sendError(res, error);
  }
}

export async function recalculateHashtags(req, res) {
  try {
    res.status(200).json(await recalculateAllHashtagsFor(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}
