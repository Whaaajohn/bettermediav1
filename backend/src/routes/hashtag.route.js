import express from "express";

import {
  getHashtag,
  getHashtagPosts,
  getTrendingHashtags,
  muteHashtag,
  recalculateHashtags,
  searchHashtags,
  unmuteHashtag,
} from "../controllers/hashtag.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/trending", getTrendingHashtags);
router.get("/search", searchHashtags);
router.post("/recalculate", recalculateHashtags);
router.post("/:tag/mute", muteHashtag);
router.delete("/:tag/mute", unmuteHashtag);
router.get("/:tag/posts", getHashtagPosts);
router.get("/:tag", getHashtag);

export default router;
