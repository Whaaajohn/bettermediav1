import express from "express";

import { getCallConfig } from "../controllers/call.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/config", getCallConfig);

export default router;
