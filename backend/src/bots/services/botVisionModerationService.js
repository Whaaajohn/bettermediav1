import { env } from "../../config/env.js";
import { runOllamaGenerate } from "./ollamaClient.js";
import { modelForTask } from "./ollamaRouter.js";
import { extractJsonObject, normalizeModerationDecision } from "./botJsonRepairService.js";
import { buildVisionPrompt } from "./botPromptService.js";
import { BOT_PROMPT_VERSION, BOT_RULE_VERSION } from "./botRulesService.js";
import { moderateSightengineImage } from "./sightengineService.js";

function imagePayload(imageDataUrl = "") {
  const value = String(imageDataUrl || "");
  const match = value.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return match ? match[1] : value;
}

function mergeVisionDecision(primary, secondary) {
  if (!primary) return secondary;
  if (!secondary) return primary;
  const rank = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
  const primaryRank = rank[primary.severity] || 0;
  const secondaryRank = rank[secondary.severity] || 0;
  if (secondaryRank > primaryRank) return secondary;
  if (secondaryRank < primaryRank) return primary;
  return Number(secondary.confidence || 0) > Number(primary.confidence || 0) ? secondary : primary;
}

export async function moderateImageContent({ imageDataUrl = "", caption = "", context = {} } = {}) {
  let sightengineDecision = null;
  if (env.SIGHTENGINE_ENABLED) {
    try {
      sightengineDecision = await moderateSightengineImage({ imageDataUrl, caption, context });
      const hybridMode = /hybrid/i.test(`${env.DETECTION_PROVIDER} ${env.DECISION_PROVIDER}`);
      if (sightengineDecision?.severity === "none" && !hybridMode) return sightengineDecision;
    } catch (error) {
      console.log(`[SIGHTENGINE] Image moderation fallback: ${error.message}`);
    }
  }

  const canUseOllamaVision =
    env.OLLAMA_ENABLED &&
    env.OLLAMA_VISION_ENABLED &&
    String(imageDataUrl || "").startsWith("data:image/");

  if (!canUseOllamaVision) {
    return sightengineDecision || {
      allowed: true,
      category: "none",
      severity: "none",
      confidence: 0,
      recommendedAction: "log",
      reasonUser: "Vision moderation is offline; content was sent to normal app review only.",
      reasonStaff: "Ollama vision disabled or unavailable.",
      evidenceSummary: "",
      modelUsed: "vision-disabled",
      ruleVersion: BOT_RULE_VERSION,
      promptVersion: BOT_PROMPT_VERSION,
    };
  }

  const prompt = buildVisionPrompt({ caption, context });
  const first = await runOllamaGenerate({
    task: "vision",
    model: modelForTask("vision"),
    prompt,
    images: [imagePayload(imageDataUrl)],
    format: "json",
    temperature: 0.12,
    numPredict: 260,
    timeoutMs: env.OLLAMA_VISION_TIMEOUT_MS,
  });

  let parsed = first.ok ? extractJsonObject(first.response) : null;
  let fallback = null;
  if (!parsed) {
    fallback = await runOllamaGenerate({
      task: "strongVision",
      model: modelForTask("strongVision"),
      prompt,
      images: [imagePayload(imageDataUrl)],
      format: "json",
      temperature: 0.08,
      numPredict: 260,
      timeoutMs: env.OLLAMA_VISION_TIMEOUT_MS,
    });
    parsed = fallback.ok ? extractJsonObject(fallback.response) : null;
  }

  const normalized = normalizeModerationDecision(parsed || { recommendedAction: "admin_review", severity: "medium" }, {
    category: "other",
    severity: parsed ? "none" : "medium",
    recommendedAction: parsed ? "log" : "admin_review",
    reasonUser: parsed ? "Image checked." : "Image needs admin review because local vision returned an unclear result.",
    reasonStaff: parsed ? "Vision model checked image." : "Vision model failed or returned invalid JSON.",
  });

  return mergeVisionDecision(sightengineDecision, {
    ...normalized,
    modelUsed: first.modelUsed,
    fallbackModelUsed: fallback?.modelUsed || null,
    provider: "ollama-vision",
    ruleVersion: BOT_RULE_VERSION,
    promptVersion: BOT_PROMPT_VERSION,
  });
}
