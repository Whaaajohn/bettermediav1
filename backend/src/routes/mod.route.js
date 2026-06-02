import express from "express";

import {
  applyModerationAction,
  approveBotAction,
  blockHashtag,
  createAppeal,
  createReport,
  deleteNotification,
  downrankPost,
  getAdminPanel,
  getAppeals,
  getBotActions,
  getBotModeration,
  getBotTraining,
  getMyAppeals,
  getMyReports,
  getNotifications,
  getReports,
  getReportedAlgorithmPosts,
  getSpammyPosts,
  markNotificationsRead,
  removePostFromFeed,
  rejectBotAction,
  rescanBotTarget,
  resolveAppeal,
  resolveReport,
  runMigrationDryRun,
  sendSmtpTest,
  sendStaffNotification,
  testMongo,
  testOllama,
  testRedis,
  testSightengineImage,
  testSightengineText,
  testUpload,
  undoBotAction,
  unblockHashtag,
  updateAdminSettings,
  updateBotSettings,
  updateBotTraining,
} from "../controllers/mod.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/admin", getAdminPanel);
router.get("/admin/bot-training", getBotTraining);
router.put("/admin/bot-training", updateBotTraining);
router.put("/admin/settings", updateAdminSettings);
router.post("/admin/smtp-test", sendSmtpTest);
router.post("/admin/test/mongo", testMongo);
router.post("/admin/test/redis", testRedis);
router.post("/admin/test/sightengine-text", testSightengineText);
router.post("/admin/test/sightengine-image", testSightengineImage);
router.post("/admin/test/upload", testUpload);
router.post("/admin/test/ollama", testOllama);
router.post("/admin/migration/dry-run", runMigrationDryRun);
router.get("/bot", getBotModeration);
router.get("/bot/admin", getBotModeration);
router.patch("/bot/settings", updateBotSettings);
router.get("/bot/actions", getBotActions);
router.post("/bot/actions/:id/approve", approveBotAction);
router.post("/bot/actions/:id/reject", rejectBotAction);
router.post("/bot/actions/:id/undo", undoBotAction);
router.post("/bot/rescan/:targetType/:targetId", rescanBotTarget);
router.get("/notifications", getNotifications);
router.put("/notifications/read", markNotificationsRead);
router.delete("/notifications/:id", deleteNotification);
router.get("/reports/me", getMyReports);
router.get("/reports", getReports);
router.post("/reports", createReport);
router.put("/reports/:id", resolveReport);
router.get("/algorithm/reported-posts", getReportedAlgorithmPosts);
router.get("/algorithm/spammy-posts", getSpammyPosts);
router.post("/posts/:id/downrank", downrankPost);
router.post("/posts/:id/remove-from-feed", removePostFromFeed);
router.post("/hashtags/:tag/block", blockHashtag);
router.post("/hashtags/:tag/unblock", unblockHashtag);
router.get("/appeals", getAppeals);
router.get("/appeals/me", getMyAppeals);
router.post("/appeals", createAppeal);
router.put("/appeals/:id", resolveAppeal);
router.post("/users/:id/action", applyModerationAction);
router.post("/users/:id/notify", sendStaffNotification);

export default router;
