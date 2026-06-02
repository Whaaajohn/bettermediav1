import express from "express";

import { getFeed } from "../controllers/feed.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/for-you", getFeed);
router.get("/following", getFeed);
router.get("/language", getFeed);
router.get("/trending", getFeed);
router.get("/discover", getFeed);

export default router;
