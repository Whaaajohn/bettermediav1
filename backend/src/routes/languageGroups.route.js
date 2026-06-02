import express from "express";

import {
  getLanguageGroup,
  getLanguageGroupPosts,
  listLanguageGroups,
  syncMe,
} from "../controllers/languageGroups.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);
router.get("/", listLanguageGroups);
router.post("/sync-me", syncMe);
router.get("/:slug", getLanguageGroup);
router.get("/:slug/posts", getLanguageGroupPosts);

export default router;
