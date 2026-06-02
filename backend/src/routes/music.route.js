import express from "express";

import { providers, search, trending } from "../controllers/music.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { localRateLimit } from "../middleware/rateLimit.middleware.js";
import { env } from "../config/env.js";

const router = express.Router();

router.use(protectRoute);
router.get("/providers", providers);
router.get("/search", localRateLimit({ bucket: "music", max: env.POST_RATE_LIMIT_MAX, windowMs: env.RATE_LIMIT_WINDOW_MS }), search);
router.get("/trending", trending);

export default router;
