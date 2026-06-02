import {
  createMessage,
  deleteBotMemoryFor,
  getBotAdminDataFor,
  getBotHealthFor,
  getBotAppealReviewPayloadFor,
  getBotMemoryFor,
  getBotModelsFor,
  getBotProfileFor,
  getBotSettingsFor,
  getMessagesBetween,
  reviewBotActionFor,
  saveBotAppealReviewFor,
  undoBotActionFor,
  updateBotSettingsFor,
} from "../lib/localStore.js";
import { getBotRuntimeStats } from "../bots/index.js";
import { moderateTextContent } from "../bots/services/botModerationService.js";
import { moderateImageContent } from "../bots/services/botVisionModerationService.js";
import { reviewAppealWithBot } from "../bots/services/botAppealService.js";

function sendError(res, error, fallback = "Internal server error") {
  res.status(error.status || 500).json({
    message: error.message || fallback,
    code: error.code || "BOT_ERROR",
  });
}

export async function getBotProfile(req, res) {
  try {
    const profile = await getBotProfileFor(req.user.id);
    res.status(200).json(profile);
  } catch (error) {
    console.error("[MEDIA BOT] Profile error:", error.message);
    sendError(res, error);
  }
}

export async function getBotHealth(req, res) {
  try {
    const health = await getBotRuntimeStats(req.user.id);
    res.status(200).json(health);
  } catch (error) {
    console.error("[MEDIA BOT] Health error:", error.message);
    sendError(res, error);
  }
}

export async function getBotModels(req, res) {
  try {
    const models = await getBotModelsFor(req.user.id);
    res.status(200).json(models);
  } catch (error) {
    console.error("[MEDIA BOT] Models error:", error.message);
    sendError(res, error);
  }
}

export async function messageBot(req, res) {
  try {
    const bot = await getBotProfileFor(req.user.id);
    const botId = bot.profile?._id;
    if (!botId) {
      return res.status(503).json({ message: "MEDIA ModBot is not ready yet." });
    }

    const message = await createMessage({
      sender: req.user.id,
      recipient: botId,
      text: req.body.text || "",
      mediaDataUrl: req.body.mediaDataUrl || "",
      mediaName: req.body.mediaName || "",
      gif: req.body.gif || null,
      replyTo: req.body.replyTo || null,
    });
    const messages = await getMessagesBetween(req.user.id, botId);
    res.status(201).json({ message, messages, bot: bot.profile });
  } catch (error) {
    console.error("[MEDIA BOT] Message error:", error.message);
    sendError(res, error);
  }
}

export async function getMyBotMemory(req, res) {
  try {
    const memory = await getBotMemoryFor(req.user.id);
    res.status(200).json(memory);
  } catch (error) {
    console.error("[MEDIA BOT] Memory error:", error.message);
    sendError(res, error);
  }
}

export async function deleteMyBotMemory(req, res) {
  try {
    const result = await deleteBotMemoryFor(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("[MEDIA BOT] Delete memory error:", error.message);
    sendError(res, error);
  }
}

export async function scanBotText(req, res) {
  try {
    const decision = await moderateTextContent({
      text: req.body.text || "",
      user: req.user,
      context: {
        source: req.body.source || "manual-scan",
        targetType: req.body.targetType || "text",
        eventType: req.body.eventType || "scan",
      },
    });
    res.status(200).json(decision);
  } catch (error) {
    console.error("[MEDIA BOT] Text scan error:", error.message);
    sendError(res, error);
  }
}

export async function scanBotImage(req, res) {
  try {
    const decision = await moderateImageContent({
      imageDataUrl: req.body.imageDataUrl || req.body.image || "",
      caption: req.body.caption || req.body.text || "",
      context: {
        source: req.body.source || "manual-image-scan",
        targetType: req.body.targetType || "image",
      },
    });
    res.status(200).json(decision);
  } catch (error) {
    console.error("[MEDIA BOT] Image scan error:", error.message);
    sendError(res, error);
  }
}

export async function moderateBotTargetText(req, res) {
  try {
    const targetType = req.params.targetType || req.body.targetType || "content";
    const decision = await moderateTextContent({
      text: req.body.text || req.body.caption || "",
      user: req.user,
      context: {
        source: `manual-${targetType}`,
        targetType,
        targetId: req.body.targetId || null,
      },
    });
    res.status(200).json(decision);
  } catch (error) {
    console.error("[MEDIA BOT] Moderate target error:", error.message);
    sendError(res, error);
  }
}

export async function applyBotAction(req, res) {
  try {
    const action = await reviewBotActionFor(req.user.id, req.params.id, {
      status: "approved",
      reason: req.body.reason || "Applied from Bot API",
    });
    res.status(200).json(action);
  } catch (error) {
    console.error("[MEDIA BOT] Apply action error:", error.message);
    sendError(res, error);
  }
}

export async function undoBotAction(req, res) {
  try {
    const action = await undoBotActionFor(req.user.id, req.params.id, req.body.reason || "Undone from Bot API");
    res.status(200).json(action);
  } catch (error) {
    console.error("[MEDIA BOT] Undo action error:", error.message);
    sendError(res, error);
  }
}

export async function restoreBotAction(req, res) {
  try {
    const action = await undoBotActionFor(req.user.id, req.params.id, req.body.reason || "Content restored from Bot API");
    res.status(200).json(action);
  } catch (error) {
    console.error("[MEDIA BOT] Restore action error:", error.message);
    sendError(res, error);
  }
}

export async function reviewAppealWithModBot(req, res) {
  try {
    const payload = await getBotAppealReviewPayloadFor(req.user.id, req.params.id);
    const review = await reviewAppealWithBot({
      appeal: payload.rawAppeal,
      user: payload.userPrivate,
      originalDecision: payload.originalDecision,
      content: payload.content,
    });
    const saved = await saveBotAppealReviewFor(req.user.id, req.params.id, review);
    res.status(200).json({ review, saved, appeal: payload.appeal });
  } catch (error) {
    console.error("[MEDIA BOT] Appeal review error:", error.message);
    sendError(res, error);
  }
}

export async function getBotSettings(req, res) {
  try {
    const settings = await getBotSettingsFor(req.user.id);
    res.status(200).json(settings);
  } catch (error) {
    console.error("[MEDIA BOT] Settings error:", error.message);
    sendError(res, error);
  }
}

export async function updateBotSettings(req, res) {
  try {
    const settings = await updateBotSettingsFor(req.user.id, req.body);
    res.status(200).json(settings);
  } catch (error) {
    console.error("[MEDIA BOT] Update settings error:", error.message);
    sendError(res, error);
  }
}

export async function getBotAdmin(req, res) {
  try {
    const data = await getBotAdminDataFor(req.user.id);
    res.status(200).json(data);
  } catch (error) {
    console.error("[MEDIA BOT] Admin data error:", error.message);
    sendError(res, error);
  }
}
