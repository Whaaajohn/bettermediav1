import {
  getLanguageGroupFor,
  getLanguageGroupPostsFor,
  getLanguageGroupsFor,
  syncLanguageGroupsFor,
} from "../lib/localStore.js";

function sendError(res, error, fallback = "Language group request failed") {
  res.status(error.status || 500).json({
    message: error.message || fallback,
    code: error.code || "LANGUAGE_GROUP_ERROR",
  });
}

export async function listLanguageGroups(req, res) {
  try {
    res.status(200).json(await getLanguageGroupsFor(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getLanguageGroup(req, res) {
  try {
    const group = await getLanguageGroupFor(req.user.id, req.params.slug);
    if (!group) return res.status(404).json({ message: "Language group not found" });
    res.status(200).json(group);
  } catch (error) {
    sendError(res, error);
  }
}

export async function getLanguageGroupPosts(req, res) {
  try {
    res.status(200).json(await getLanguageGroupPostsFor(req.user.id, req.params.slug));
  } catch (error) {
    sendError(res, error);
  }
}

export async function syncMe(req, res) {
  try {
    res.status(200).json(await syncLanguageGroupsFor(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}
