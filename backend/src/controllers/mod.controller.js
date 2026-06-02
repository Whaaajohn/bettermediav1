import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

import {
  applyModerationActionFor,
  applyBotDecisionFor,
  createAppealFor,
  createReportFor,
  deleteNotificationFor,
  getAdminPanelFor,
  getBotActionsFor,
  getBotAdminDataFor,
  getBotAppealAutoReviewPayloadFor,
  getBotTargetScanPayloadFor,
  getAppealsForUser,
  getBotTrainingFor,
  getNotificationsFor,
  getReportedAlgorithmPostsFor,
  getReportsForUser,
  getSpammyPostsFor,
  markNotificationsReadFor,
  moderatePostRankingFor,
  reviewBotActionFor,
  resolveBotAppealByBot,
  resolveAppealFor,
  resolveReportFor,
  sendStaffNotificationFor,
  setHashtagBlockFor,
  undoBotActionFor,
  updateAdminSettingsFor,
  updateBotSettingsFor,
  updateBotTrainingFor,
} from "../lib/localStore.js";
import { notifyBotAppealCreated, notifyBotReportCreated } from "../bots/index.js";
import { getBotQueueStatus } from "../bots/botQueue.js";
import { getOllamaHealthCache, runOllamaGenerate } from "../bots/services/ollamaClient.js";
import { modelForTask } from "../bots/services/ollamaRouter.js";
import {
  getSightengineStatus,
  moderateSightengineImage,
  moderateSightengineText,
} from "../bots/services/sightengineService.js";
import { getDatabaseStatus } from "../config/database.js";
import { env } from "../config/env.js";
import { getRedisClient, getRedisStatus } from "../config/redis.js";
import { getUploadDirectory, getUploadHealth } from "../config/storage.js";
import { getWorkerStatus } from "../config/workers.js";
import { getMailEvents, getSmtpStatus, sendStaffEmail } from "../lib/smtpMailer.js";
import { reviewAppealWithBot } from "../bots/services/botAppealService.js";
import { moderateTextContent } from "../bots/services/botModerationService.js";
import { saveUploadDataUrl } from "../services/storage.service.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function assertAdminPanelAccess(userId) {
  await getAdminPanelFor(userId);
}

export async function getAdminPanel(req, res) {
  try {
    const panel = await getAdminPanelFor(req.user.id);
    const redis = getRedisStatus();
    const ollama = getOllamaHealthCache();
    const uploads = await getUploadHealth();
    const diagnostics = {
      mode: env.NODE_ENV,
      localDev: env.LOCAL_DEV,
      database: getDatabaseStatus(),
      redis,
      storage: uploads,
      uploads,
      sightengine: getSightengineStatus(),
      smtp: getSmtpStatus(),
      turn: {
        enabled: env.TURN_ENABLED,
        configured: Boolean(env.TURN_URL && env.TURN_USERNAME && env.TURN_PASSWORD),
      },
      providers: {
        detection: env.DETECTION_PROVIDER,
        decision: env.DECISION_PROVIDER,
        appealReviewer: env.APPEAL_REVIEWER,
      },
      queues: {
        bot: getBotQueueStatus(),
        workers: getWorkerStatus(),
      },
      ollama: {
        enabled: env.OLLAMA_ENABLED,
        healthy: !env.OLLAMA_ENABLED || ollama.some((item) => item.ok),
        models: ollama,
      },
      ready: Boolean(getDatabaseStatus().connected && (!redis.required || redis.connected) && uploads.healthy),
    };
    res.status(200).json({
      ...panel,
      smtp: diagnostics.smtp,
      mailEvents: getMailEvents(),
      diagnostics,
    });
  } catch (error) {
    console.error("[LOCAL MOD] Error loading admin panel:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getReportedAlgorithmPosts(req, res) {
  try {
    const posts = await getReportedAlgorithmPostsFor(req.user.id);
    res.status(200).json(posts);
  } catch (error) {
    console.error("[LOCAL MOD] Error loading reported algorithm posts:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getSpammyPosts(req, res) {
  try {
    const posts = await getSpammyPostsFor(req.user.id);
    res.status(200).json(posts);
  } catch (error) {
    console.error("[LOCAL MOD] Error loading spammy posts:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function downrankPost(req, res) {
  try {
    const post = await moderatePostRankingFor(req.user.id, req.params.id, "downrank", req.body.reason);
    res.status(200).json(post);
  } catch (error) {
    console.error("[LOCAL MOD] Error downranking post:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function removePostFromFeed(req, res) {
  try {
    const post = await moderatePostRankingFor(req.user.id, req.params.id, "remove-from-feed", req.body.reason);
    res.status(200).json(post);
  } catch (error) {
    console.error("[LOCAL MOD] Error removing post from feed:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function blockHashtag(req, res) {
  try {
    const hashtag = await setHashtagBlockFor(req.user.id, req.params.tag, true);
    res.status(200).json(hashtag);
  } catch (error) {
    console.error("[LOCAL MOD] Error blocking hashtag:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function unblockHashtag(req, res) {
  try {
    const hashtag = await setHashtagBlockFor(req.user.id, req.params.tag, false);
    res.status(200).json(hashtag);
  } catch (error) {
    console.error("[LOCAL MOD] Error unblocking hashtag:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function deleteNotification(req, res) {
  try {
    const result = await deleteNotificationFor(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("[LOCAL MOD] Error deleting notification:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function markNotificationsRead(req, res) {
  try {
    const result = await markNotificationsReadFor(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("[LOCAL MOD] Error marking notifications read:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function createReport(req, res) {
  try {
    const report = await createReportFor(req.user.id, req.body);
    notifyBotReportCreated(report, req.user);
    console.log(`[LOCAL MOD] Report created by ${req.user.fullName}: ${report.targetType}`);
    res.status(201).json(report);
  } catch (error) {
    console.error("[LOCAL MOD] Error creating report:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function resolveReport(req, res) {
  try {
    const report = await resolveReportFor(req.user.id, req.params.id, req.body);
    console.log(`[LOCAL MOD] Report ${report._id} marked ${report.status}`);
    res.status(200).json(report);
  } catch (error) {
    console.error("[LOCAL MOD] Error resolving report:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function createAppeal(req, res) {
  try {
    let appeal = await createAppealFor(req.user.id, req.body);
    let botReview = null;
    notifyBotAppealCreated(appeal, req.user);
    if (appeal.botActionId) {
      try {
        const payload = await getBotAppealAutoReviewPayloadFor(appeal._id);
        const review = await reviewAppealWithBot({
          appeal: payload.rawAppeal || payload.appeal,
          user: payload.userPrivate || payload.user,
          originalDecision: payload.originalDecision,
          content: payload.content,
        });
        botReview = await resolveBotAppealByBot(appeal._id, review);
        appeal = botReview.appeal || appeal;
      } catch (botError) {
        console.error("[LOCAL MOD] ModBot appeal review skipped:", botError.message);
      }
    }
    console.log(`[LOCAL MOD] Appeal created by ${req.user.fullName}`);
    res.status(201).json(botReview ? { ...appeal, botReview } : appeal);
  } catch (error) {
    console.error("[LOCAL MOD] Error creating appeal:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getMyAppeals(req, res) {
  try {
    const appeals = await getAppealsForUser(req.user.id);
    res.status(200).json(appeals);
  } catch (error) {
    console.error("[LOCAL MOD] Error loading appeals:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getReports(req, res) {
  try {
    const panel = await getAdminPanelFor(req.user.id);
    res.status(200).json(panel.reports || []);
  } catch (error) {
    console.error("[LOCAL MOD] Error loading reports:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getMyReports(req, res) {
  try {
    const reports = await getReportsForUser(req.user.id);
    res.status(200).json(reports);
  } catch (error) {
    console.error("[LOCAL MOD] Error loading user reports:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getAppeals(req, res) {
  try {
    const panel = await getAdminPanelFor(req.user.id);
    res.status(200).json(panel.appeals || []);
  } catch (error) {
    console.error("[LOCAL MOD] Error loading appeals:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function resolveAppeal(req, res) {
  try {
    const appeal = await resolveAppealFor(req.user.id, req.params.id, req.body);
    let mail = null;
    if (appeal.user?.email) {
      try {
        mail = await sendStaffEmail({
          to: appeal.user.email,
          name: appeal.user.fullName,
          title: `Appeal ${appeal.status}`,
          message: appeal.response || `Your appeal was ${appeal.status}.`,
          staffName: req.user.fullName,
        });
      } catch (mailError) {
        mail = { sent: false, reason: mailError.message };
      }
    }
    console.log(`[LOCAL MOD] Appeal ${appeal._id} marked ${appeal.status}`);
    res.status(200).json({ appeal, mail });
  } catch (error) {
    console.error("[LOCAL MOD] Error resolving appeal:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function applyModerationAction(req, res) {
  try {
    const result = await applyModerationActionFor(req.user.id, req.params.id, req.body);
    console.log(`[LOCAL MOD] ${req.body.type} applied to ${result.user.fullName}`);
    res.status(200).json(result);
  } catch (error) {
    console.error("[LOCAL MOD] Error applying action:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function sendStaffNotification(req, res) {
  try {
    const notification = await sendStaffNotificationFor(req.user.id, req.params.id, req.body);
    let mail = null;
    if (req.body.email !== false && notification.user?.email) {
      try {
        mail = await sendStaffEmail({
          to: notification.user.email,
          name: notification.user.fullName,
          title: notification.notification.title,
          message: notification.notification.message,
          staffName: req.user.fullName,
        });
      } catch (mailError) {
        mail = { sent: false, reason: mailError.message };
      }
    }
    console.log(`[LOCAL MOD] Staff notification sent to ${req.params.id}`);
    res.status(201).json({ ...notification, mail });
  } catch (error) {
    console.error("[LOCAL MOD] Error sending staff notification:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getBotTraining(req, res) {
  try {
    const config = await getBotTrainingFor(req.user.id);
    res.status(200).json(config);
  } catch (error) {
    console.error("[LOCAL MOD] Error loading bot training:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function updateBotTraining(req, res) {
  try {
    const config = await updateBotTrainingFor(req.user.id, req.body);
    res.status(200).json(config);
  } catch (error) {
    console.error("[LOCAL MOD] Error updating bot training:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getBotModeration(req, res) {
  try {
    const data = await getBotAdminDataFor(req.user.id);
    res.status(200).json(data);
  } catch (error) {
    console.error("[LOCAL MOD] Error loading bot moderation:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function updateBotSettings(req, res) {
  try {
    const settings = await updateBotSettingsFor(req.user.id, req.body);
    res.status(200).json(settings);
  } catch (error) {
    console.error("[LOCAL MOD] Error updating bot settings:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function rescanBotTarget(req, res) {
  try {
    const payload = await getBotTargetScanPayloadFor(req.user.id, req.params.targetType, req.params.targetId);
    const decision = await moderateTextContent({
      text: payload.text,
      user: { _id: payload.targetUserId },
      context: {
        source: "admin-rescan",
        targetType: payload.targetType,
        targetId: payload.targetId,
      },
    });

    let action = null;
    if (decision.severity !== "none") {
      action = await applyBotDecisionFor({
        source: "admin-rescan",
        eventType: "rescan",
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetUserId: payload.targetUserId,
        actorUserId: payload.targetUserId,
        text: payload.text,
        category: decision.category,
        severity: decision.severity,
        confidence: decision.confidence,
        recommendedAction: decision.recommendedAction,
        minutes: decision.minutes || decision.durationMinutes,
        reason: decision.reasonStaff || decision.reasonUser,
        reasonUser: decision.reasonUser,
        reasonStaff: decision.reasonStaff,
        evidenceSummary: decision.evidenceSummary,
        modelUsed: decision.modelUsed,
        fallbackModelUsed: decision.fallbackModelUsed,
        ruleVersion: decision.ruleVersion,
        promptVersion: decision.promptVersion,
        decision,
      });
    }

    res.status(200).json({ payload, decision, action });
  } catch (error) {
    console.error("[LOCAL MOD] Error rescanning target:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function getBotActions(req, res) {
  try {
    const actions = await getBotActionsFor(req.user.id, { status: req.query.status || "all" });
    res.status(200).json(actions);
  } catch (error) {
    console.error("[LOCAL MOD] Error loading bot actions:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function approveBotAction(req, res) {
  try {
    const action = await reviewBotActionFor(req.user.id, req.params.id, {
      status: "approved",
      reason: req.body.reason || "Approved in admin panel",
    });
    res.status(200).json(action);
  } catch (error) {
    console.error("[LOCAL MOD] Error approving bot action:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function rejectBotAction(req, res) {
  try {
    const action = await reviewBotActionFor(req.user.id, req.params.id, {
      status: "rejected",
      reason: req.body.reason || "Rejected in admin panel",
    });
    res.status(200).json(action);
  } catch (error) {
    console.error("[LOCAL MOD] Error rejecting bot action:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function undoBotAction(req, res) {
  try {
    const action = await undoBotActionFor(req.user.id, req.params.id, req.body.reason || "Undone in admin panel");
    res.status(200).json(action);
  } catch (error) {
    console.error("[LOCAL MOD] Error undoing bot action:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function updateAdminSettings(req, res) {
  try {
    const settings = await updateAdminSettingsFor(req.user.id, req.body);
    res.status(200).json(settings);
  } catch (error) {
    console.error("[LOCAL MOD] Error updating admin settings:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}

export async function sendSmtpTest(req, res) {
  try {
    if (!req.user?.email) {
      return res.status(400).json({ success: false, message: "Your admin account does not have an email address." });
    }

    const mail = await sendStaffEmail({
      to: req.user.email,
      name: req.user.fullName,
      title: "SMTP test from MEDIA",
      message: "This is a test email from your local MEDIA server. If you received it, Gmail SMTP is working on this PC.",
      staffName: req.user.fullName,
    });

    res.status(200).json({
      success: mail.sent,
      mail,
      message: mail.sent ? "SMTP test email sent." : mail.reason || "SMTP test did not send.",
    });
  } catch (error) {
    console.error("[LOCAL MOD] SMTP test failed:", error.message);
    res.status(200).json({
      success: false,
      mail: { sent: false, reason: error.message || "SMTP failed" },
      message: error.message || "SMTP test failed",
    });
  }
}

export async function testMongo(req, res) {
  try {
    await assertAdminPanelAccess(req.user.id);
    const status = getDatabaseStatus();
    let count = null;
    if (status.driver === "mongo" && status.connected) {
      const { User } = await import("../models/index.js");
      count = await User.countDocuments();
    }
    res.status(200).json({ success: Boolean(status.connected), status, userCount: count });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || "MongoDB test failed" });
  }
}

export async function testRedis(req, res) {
  try {
    await assertAdminPanelAccess(req.user.id);
    const client = getRedisClient();
    const status = getRedisStatus();
    const pong = client ? await client.ping() : "memory-fallback";
    res.status(200).json({ success: Boolean(client || !status.required), status, pong });
  } catch (error) {
    res.status(200).json({ success: false, status: getRedisStatus(), message: error.message || "Redis test failed" });
  }
}

export async function testSightengineText(req, res) {
  try {
    await assertAdminPanelAccess(req.user.id);
    if (!env.SIGHTENGINE_ENABLED || !getSightengineStatus().configured) {
      return res.status(200).json({
        success: false,
        status: getSightengineStatus(),
        message: "Sightengine is not enabled/configured.",
      });
    }
    const result = await moderateSightengineText({
      text: "BetterMedia admin safety test. Friendly app check.",
      context: { targetType: "admin_test", targetId: "sightengine-text-test" },
    });
    res.status(200).json({ success: true, status: getSightengineStatus(), result });
  } catch (error) {
    res.status(200).json({ success: false, status: getSightengineStatus(), message: error.message || "Sightengine text test failed" });
  }
}

export async function testSightengineImage(req, res) {
  try {
    await assertAdminPanelAccess(req.user.id);
    if (!env.SIGHTENGINE_ENABLED || !getSightengineStatus().configured) {
      return res.status(200).json({
        success: false,
        status: getSightengineStatus(),
        message: "Sightengine is not enabled/configured.",
      });
    }
    const transparentPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
    const result = await moderateSightengineImage({
      imageDataUrl: transparentPng,
      caption: "BetterMedia admin image moderation test.",
      context: { targetType: "admin_test_image", targetId: "sightengine-image-test" },
    });
    res.status(200).json({ success: true, status: getSightengineStatus(), result });
  } catch (error) {
    res.status(200).json({ success: false, status: getSightengineStatus(), message: error.message || "Sightengine image test failed" });
  }
}

export async function testUpload(req, res) {
  try {
    await assertAdminPanelAccess(req.user.id);
    const upload = await saveUploadDataUrl({
      dataUrl: `data:text/plain;base64,${Buffer.from("BetterMedia upload test").toString("base64")}`,
      filename: "bettermedia-upload-test.txt",
    });
    await fs.unlink(path.join(getUploadDirectory(), upload.filename)).catch(() => {});
    res.status(200).json({ success: true, upload, status: await getUploadHealth() });
  } catch (error) {
    res.status(200).json({ success: false, status: await getUploadHealth(), message: error.message || "Upload test failed" });
  }
}

export async function testOllama(req, res) {
  try {
    await assertAdminPanelAccess(req.user.id);
    if (!env.OLLAMA_ENABLED) {
      return res.status(200).json({ success: false, message: "Ollama is disabled.", models: getOllamaHealthCache() });
    }
    const result = await runOllamaGenerate({
      task: "adminDiagnostic",
      model: modelForTask("fastChat"),
      prompt: "Reply with one short sentence confirming BetterMedia ModBot can help with app support.",
      temperature: 0.1,
      numPredict: 32,
      timeoutMs: Math.min(env.OLLAMA_TIMEOUT_MS, 12000),
    });
    res.status(200).json({
      success: Boolean(result.ok),
      model: result.modelUsed,
      elapsedMs: result.elapsedMs,
      response: result.ok ? result.response : "",
      message: result.ok ? "Ollama test completed." : result.error || "Ollama test failed.",
      models: getOllamaHealthCache(),
    });
  } catch (error) {
    res.status(200).json({ success: false, message: error.message || "Ollama test failed", models: getOllamaHealthCache() });
  }
}

export async function runMigrationDryRun(req, res) {
  try {
    await assertAdminPanelAccess(req.user.id);
    const scriptPath = path.resolve(__dirname, "../scripts/db-migrate-local-to-mongo.js");
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, "--dry"], {
      cwd: path.resolve(__dirname, "../.."),
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 5,
    });
    const parsed = JSON.parse(stdout);
    res.status(200).json({ success: true, report: parsed, stderr: stderr || "" });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: error.message || "Migration dry run failed",
      stdout: error.stdout || "",
      stderr: error.stderr || "",
    });
  }
}

export async function getNotifications(req, res) {
  try {
    const notifications = await getNotificationsFor(req.user.id);
    res.status(200).json(notifications);
  } catch (error) {
    console.error("[LOCAL MOD] Error loading notifications:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  }
}
