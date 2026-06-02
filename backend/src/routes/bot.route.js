import express from "express";

import {
  applyBotAction,
  deleteMyBotMemory,
  getBotAdmin,
  getBotHealth,
  getBotModels,
  getMyBotMemory,
  getBotProfile,
  getBotSettings,
  messageBot,
  moderateBotTargetText,
  restoreBotAction,
  reviewAppealWithModBot,
  scanBotImage,
  scanBotText,
  undoBotAction,
  updateBotSettings,
} from "../controllers/bot.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/profile", getBotProfile);
router.get("/health", getBotHealth);
router.get("/models", getBotModels);
router.post("/message", messageBot);
router.get("/memory/me", getMyBotMemory);
router.delete("/memory/me", deleteMyBotMemory);
router.post("/scan/text", scanBotText);
router.post("/scan/image", scanBotImage);
router.post("/moderate/:targetType", moderateBotTargetText);
router.post("/moderate/post", moderateBotTargetText);
router.post("/moderate/comment", moderateBotTargetText);
router.post("/moderate/message", moderateBotTargetText);
router.post("/actions/:id/apply", applyBotAction);
router.post("/actions/:id/undo", undoBotAction);
router.post("/actions/:id/restore", restoreBotAction);
router.post("/appeals/:id/review", reviewAppealWithModBot);
router.get("/admin", getBotAdmin);
router.get("/settings", getBotSettings);
router.patch("/settings", updateBotSettings);

export default router;
