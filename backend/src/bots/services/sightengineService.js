import { env } from "../../config/env.js";

const status = {
  enabled: env.SIGHTENGINE_ENABLED,
  configured: Boolean(env.SIGHTENGINE_API_USER && env.SIGHTENGINE_API_SECRET),
  healthy: false,
  strictness: env.SIGHTENGINE_STRICTNESS,
  lastCheckedAt: null,
  lastError: "",
  failedCalls: 0,
  retryCount: 0,
  fallbackMode: "rules_ollama",
};

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

function configured() {
  return env.SIGHTENGINE_ENABLED && env.SIGHTENGINE_API_USER && env.SIGHTENGINE_API_SECRET;
}

function thresholds() {
  if (env.SIGHTENGINE_STRICTNESS === "high") return { medium: 0.42, high: 0.65, critical: 0.88 };
  if (env.SIGHTENGINE_STRICTNESS === "low") return { medium: 0.68, high: 0.84, critical: 0.96 };
  return { medium: 0.55, high: 0.76, critical: 0.92 };
}

function updateStatus(ok, error = "") {
  status.lastCheckedAt = new Date().toISOString();
  status.healthy = Boolean(ok);
  status.lastError = error || "";
  if (!ok && error) status.failedCalls += 1;
}

export function getSightengineStatus() {
  return {
    ...status,
    enabled: env.SIGHTENGINE_ENABLED,
    configured: Boolean(env.SIGHTENGINE_API_USER && env.SIGHTENGINE_API_SECRET),
    detectionProvider: env.DETECTION_PROVIDER,
    decisionProvider: env.DECISION_PROVIDER,
  };
}

function walkNumbers(input, path = "", output = []) {
  if (!input || typeof input !== "object") return output;
  Object.entries(input).forEach(([key, value]) => {
    const nextPath = path ? `${path}.${key}` : key;
    if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1) {
      output.push({ path: nextPath, score: value });
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      walkNumbers(value, nextPath, output);
    }
  });
  return output;
}

function categoryFromPath(path = "", response = {}) {
  const value = path.toLowerCase();
  if (/hate|racis|offensive|profanity|slur|discriminatory|insulting|toxic/.test(value)) {
    return /slur|racis|discriminatory/.test(value) ? "slur" : "hate";
  }
  if (/weapon|violence|violent|threat/.test(value)) return "violence";
  if (/gore|graphic/.test(value)) return "graphic";
  if (/scam/.test(value)) return "scam";
  if (/spam|link/.test(value)) return "spam";
  if (/nudity|sexual|minor|erotica|suggestive/.test(value)) return "sexual";
  if (/personal|email|phone|address|privacy/.test(value)) return "privacy";
  return "other";
}

function isModerationScorePath(path = "") {
  const value = path.toLowerCase();
  if (/^(request|media|metadata|status|error)\b/.test(value)) return false;
  if (/(^|\.)(none|safe|outdoor_other|indoor_other|context)(\.|$)/.test(value)) return false;
  if (/categories\.none$/.test(value)) return false;
  return /moderation_classes|nudity|weapon|gore|offensive|scam|text-content|profanity|hate|racis|slur|discriminatory|insulting|toxic|violent|sexual|minor|spam|privacy|personal|self-harm|medical|drugs/i.test(
    value
  );
}

function severityFromScore(score) {
  const limits = thresholds();
  if (score >= limits.critical) return "critical";
  if (score >= limits.high) return "high";
  if (score >= limits.medium) return "medium";
  return "none";
}

function actionFor({ severity, category, targetType, media }) {
  if (severity === "none") return "allow";
  if (severity === "critical" && !media && ["hate", "slur", "violence", "scam"].includes(category)) return "temp_ban";
  if (severity === "critical") return media ? "quarantine" : "hide_content";
  if (severity === "high" && !media && ["hate", "slur"].includes(category)) return "temp_ban";
  if (severity === "high" && !media && ["violence", "scam", "doxxing"].includes(category)) return "temp_mute";
  if (severity === "high") return targetType === "profile" || targetType === "user" ? "admin_review" : "hide_content";
  if (severity === "medium") return ["message", "comment", "reply"].includes(targetType) ? "warn" : "quarantine";
  return "log";
}

function normalizeSightengineDecision({ response, targetType = "content", targetId = "", media = false }) {
  const scores = walkNumbers(response).filter(
    (item) => isModerationScorePath(item.path) && !/face|quality|sharpness/i.test(item.path)
  );
  const strongest = scores.sort((a, b) => b.score - a.score)[0] || { path: "none", score: 0 };
  const category = categoryFromPath(strongest.path, response);
  const severity = severityFromScore(strongest.score);
  const recommendedAction = actionFor({ severity, category, targetType, media });

  return {
    targetType,
    targetId,
    allowed: severity === "none",
    category: severity === "none" ? "none" : category,
    severity,
    confidence: Number(strongest.score || 0),
    scores: scores.slice(0, 12).reduce((acc, item) => {
      acc[item.path] = Number(item.score || 0);
      return acc;
    }, {}),
    recommendedAction,
    durationMinutes: recommendedAction === "temp_ban" ? env.BOT_CRITICAL_TEMP_BAN_MINUTES : null,
    minutes: recommendedAction === "temp_ban" ? env.BOT_CRITICAL_TEMP_BAN_MINUTES : 0,
    reasonUser:
      severity === "none"
        ? "Sightengine did not find unsafe content."
        : "BetterMedia safety checks flagged this content for review.",
    reasonStaff:
      severity === "none"
        ? "Sightengine returned no threshold hit."
        : `Sightengine ${env.SIGHTENGINE_STRICTNESS} threshold hit: ${strongest.path}=${strongest.score}.`,
    evidenceSummary: severity === "none" ? "" : `Provider signal: ${strongest.path}`,
    appealAllowed: true,
    restoreEligible: true,
    provider: "sightengine",
    modelUsed: "sightengine",
  };
}

async function postForm(url, form) {
  const { controller, timer } = timeoutSignal(env.SIGHTENGINE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status === "failure") {
      throw new Error(data.error?.message || data.error || `Sightengine HTTP ${response.status}`);
    }
    updateStatus(true);
    return data;
  } catch (error) {
    updateStatus(false, error.message);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function moderateSightengineText({ text = "", context = {} } = {}) {
  if (!configured() || !String(text || "").trim()) return null;
  const form = new URLSearchParams();
  form.set("api_user", env.SIGHTENGINE_API_USER);
  form.set("api_secret", env.SIGHTENGINE_API_SECRET);
  form.set("text", String(text || "").slice(0, env.BOT_TEXT_SCAN_MAX_LENGTH || 4000));
  form.set("lang", context.language || "en");
  form.set("mode", env.SIGHTENGINE_TEXT_MODE);

  const response = await postForm(env.SIGHTENGINE_TEXT_ENDPOINT, form);
  return normalizeSightengineDecision({
    response,
    targetType: context.targetType || "text",
    targetId: context.targetId || "",
    media: false,
  });
}

function dataUrlToBlob(dataUrl = "") {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  return new Blob([bytes], { type: match[1] });
}

export async function moderateSightengineImage({ imageDataUrl = "", imageUrl = "", caption = "", context = {} } = {}) {
  if (!configured()) return null;
  const form = new FormData();
  form.set("api_user", env.SIGHTENGINE_API_USER);
  form.set("api_secret", env.SIGHTENGINE_API_SECRET);
  form.set("models", env.SIGHTENGINE_MODELS);
  if (caption) form.set("text", String(caption).slice(0, 1200));

  const blob = dataUrlToBlob(imageDataUrl);
  if (blob) form.set("media", blob, "bettermedia-upload.jpg");
  else if (imageUrl) form.set("url", imageUrl);
  else return null;

  const response = await postForm(env.SIGHTENGINE_IMAGE_ENDPOINT, form);
  return normalizeSightengineDecision({
    response,
    targetType: context.targetType || "image",
    targetId: context.targetId || "",
    media: true,
  });
}
