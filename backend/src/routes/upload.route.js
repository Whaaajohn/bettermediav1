import express from "express";

import { uploadDataUrl } from "../controllers/upload.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, uploadDataUrl);

export default router;
