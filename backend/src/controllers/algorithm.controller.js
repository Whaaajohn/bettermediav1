import {
  getAlgorithmProfileFor,
  hidePostFor,
  recordAlgorithmEventFor,
  recordPostViewFor,
  resetAlgorithmFor,
  updateAlgorithmInterestsFor,
} from "../lib/localStore.js";

function sendError(res, error) {
  res.status(error.status || 500).json({ message: error.message || "Internal server error" });
}

export async function getMyAlgorithm(req, res) {
  try {
    res.status(200).json(await getAlgorithmProfileFor(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateInterests(req, res) {
  try {
    res.status(200).json(await updateAlgorithmInterestsFor(req.user.id, req.body));
  } catch (error) {
    sendError(res, error);
  }
}

export async function resetAlgorithm(req, res) {
  try {
    res.status(200).json(await resetAlgorithmFor(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function recordEvent(req, res) {
  try {
    res.status(201).json(await recordAlgorithmEventFor(req.user.id, req.body));
  } catch (error) {
    sendError(res, error);
  }
}

export async function recordView(req, res) {
  try {
    res.status(201).json(await recordPostViewFor(req.user.id, req.params.id, req.body));
  } catch (error) {
    sendError(res, error);
  }
}

export async function hidePost(req, res) {
  try {
    res.status(200).json(await hidePostFor(req.user.id, req.params.id, "hide"));
  } catch (error) {
    sendError(res, error);
  }
}

export async function notInterested(req, res) {
  try {
    res.status(200).json(await hidePostFor(req.user.id, req.params.id, "not_interested"));
  } catch (error) {
    sendError(res, error);
  }
}
