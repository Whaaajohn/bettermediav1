import express from "express";

import {
  createSupportTicket,
  getSiteSettings,
} from "../controllers/site.controller.js";

const router = express.Router();

router.get("/settings", getSiteSettings);
router.post("/support-tickets", createSupportTicket);

export default router;
