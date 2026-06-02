import express from "express";

import {
  getMyAlgorithm,
  recordEvent,
  resetAlgorithm,
  updateInterests,
} from "../controllers/algorithm.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/me", getMyAlgorithm);
router.put("/interests", updateInterests);
router.post("/reset", resetAlgorithm);
router.post("/event", recordEvent);

export default router;
