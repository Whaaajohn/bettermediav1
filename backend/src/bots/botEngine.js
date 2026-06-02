import { env } from "../config/env.js";
import { applyBotAction } from "./botActions.js";
import { getBotEnvConfig, isBotScanEnabled } from "./botConfig.js";
import { emitBotEvent, onBotEvent } from "./botEvents.js";
import { rememberBotEvent } from "./botMemory.js";
import { enqueueBotTask, startBotQueue } from "./botQueue.js";
import { detectSpamForUser } from "./botSpamDetector.js";
import { scanTextContent } from "./botTextModeration.js";

let started = false;
let runtimeDataProvider = null;

export function setBotRuntimeDataProvider(provider) {
  runtimeDataProvider = provider;
}

async function processTextEvent(event) {
  if (!isBotScanEnabled(event.kind || event.type)) return;
  if (!runtimeDataProvider) return;

  const runtime = await runtimeDataProvider();
  const actorUser = event.actorUser || runtime.users?.find((item) => item._id === event.actorUserId);
  const subjectUser =
    runtime.users?.find(
      (item) => item._id === (event.contentUserId || event.targetUserId || event.actorUserId)
    ) || actorUser;
  if (subjectUser?.isBot) return;

  const text = event.text || event.post?.text || event.comment?.text || event.message?.text || "";
  const spam = detectSpamForUser(subjectUser?._id, text);
  rememberBotEvent(subjectUser?._id, { type: event.type, targetType: event.targetType, spamScore: spam.score });

  const decision = await scanTextContent({
    text,
    user: subjectUser,
    botTraining: runtime.botTraining,
    context: {
      source: event.source || event.type,
      targetType: event.targetType,
      targetId: event.targetId,
      eventType: event.type,
      reportContext: event.reportContext || "",
      isDirectMessage: event.type === "message",
      mentionedBot: Boolean(event.mentionedBot),
    },
  });

  const severity = spam.spam && decision.severity === "none" ? "high" : decision.severity;
  if (severity === "none" && !decision.shouldCreateReportDraft && !spam.spam) return;

  await applyBotAction({
    source: event.source || "content-scan",
    eventType: event.type,
    targetType: event.targetType,
    targetId: event.targetId,
    targetUserId: event.targetUserId || subjectUser?._id,
    actorUserId: subjectUser?._id || event.actorUserId,
    text,
    category: spam.spam ? "spam" : decision.category,
    severity,
    confidence: Math.max(decision.confidence || 0, spam.spam ? 0.8 : 0),
    recommendedAction: spam.spam ? "temp_mute" : decision.recommendedAction,
    minutes: spam.spam ? env.BOT_SPAM_MUTE_MINUTES : decision.minutes,
    reason: spam.spam ? "Repeated or spam-like content detected." : decision.reason,
    details: text,
    decision,
  });
}

export function notifyBotEvent(type, payload = {}) {
  if (!env.BOT_ENGINE_ENABLED) return false;
  const config = getBotEnvConfig();
  const priority = payload.priority || (["message", "post", "comment"].includes(type) ? "normal" : "low");
  return enqueueBotTask(() => processTextEvent({ ...payload, type, kind: type }), { priority });
}

export function notifyBotPostCreated(post, actorUser) {
  return notifyBotEvent("post", {
    post,
    actorUser,
    targetType: "post",
    targetId: post?._id,
    targetUserId: post?.author,
    text: post?.text || post?.caption || "",
  });
}

export function notifyBotCommentCreated(post, actorUser, text = "", commentId = null) {
  return notifyBotEvent("comment", {
    post,
    actorUser,
    targetType: commentId ? "comment" : "post",
    targetId: commentId || post?._id,
    targetUserId: actorUser?._id,
    text,
  });
}

export function notifyBotMessageCreated(message, actorUser) {
  return notifyBotEvent("message", {
    message,
    actorUser,
    targetType: "message",
    targetId: message?._id,
    targetUserId: message?.sender,
    text: message?.text || "",
  });
}

export function startBotEngine() {
  if (started) return { started: true, alreadyStarted: true };
  started = true;
  startBotQueue();
  onBotEvent("health", () => {});
  console.log("[MEDIA BOT] Local moderation bot engine is ready");
  return { started: true };
}
