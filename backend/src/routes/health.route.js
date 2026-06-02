import express from "express";

import { health, ready, version } from "../controllers/health.controller.js";

const router = express.Router();

router.get("/api/health", health);
router.get("/api/version", version);
router.get("/api/ready", ready);

export default router;
