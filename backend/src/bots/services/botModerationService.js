import { env } from "../../config/env.js";
import { runOllamaGenerate } from "./ollamaClient.js";
import { modelForTask } from "./ollamaRouter.js";
import { extractJsonObject, normalizeModerationDecision } from "./botJsonRepairService.js";
import { buildTextModerationPrompt } from "./botPromptService.js";
import { BOT_PROMPT_VERSION, BOT_RULE_VERSION, hardRuleScan, shouldUseReasoningPass } from "./botRulesService.js";
import { moderateSightengineText } from "./sightengineService.js";

function actionForDecision(decision = {}) {
  if (decision.recommendedAction === "allow") return "log";
  if (decision.recommendedAction === "quarantine" || decision.recommendedAction === "soft_remove") return "hide_content";
  if (decision.recommendedAction === "temp_restrict") return "restrict";
  if (decision.recommendedAction === "admin_review") return "escalate";
  return decision.recommendedAction || "log";
}

async function runJsonModeration({ prompt, task, model, fallbackModel, timeoutMs, baseDecision }) {
  const first = await runOllamaGenerate({
    task,
    model,
    prompt,
    format: "json",
    temperature: 0.12,
    numPredict: 260,
    timeoutMs,
  });

  let parsed = first.ok ? extractJsonObject(first.response) : null;
  let fallback = null;

  if (!parsed && fallbackModel) {
    fallback = await runOllamaGenerate({
      task,
      model: fallbackModel,
      prompt: `${prompt}\n\nPrevious output was invalid JSON. Return valid JSON only.`,
      format: "json",
      temperature: 0.08,
      numPredict: 260,
      timeoutMs,
    });
    parsed = fallback.ok ? extractJsonObject(fallback.response) : null;
  }

  if (!parsed) {
    return {
      ...baseDecision,
      recommendedAction: baseDecision.severity === "none" ? "log" : "escalate",
      reasonStaff: `${baseDecision.reasonStaff || "Rule scan"} Model JSON failed; routed to admin review.`,
      modelUsed: first.modelUsed || model,
      fallbackModelUsed: fallback?.modelUsed || null,
      modelFailed: true,
    };
  }

  const normalized = normalizeModerationDecision(parsed, baseDecision);
  return {
    ...normalized,
    modelUsed: first.modelUsed || model,
    fallbackModelUsed: fallback?.modelUsed || null,
    modelLatencyMs: first.elapsedMs,
    ruleVersion: BOT_RULE_VERSION,
    promptVersion: BOT_PROMPT_VERSION,
  };
}

function mergeDecision(primary, secondary) {
  if (!secondary) return primary;
  const rank = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
  const primaryRank = rank[primary.severity] || 0;
  const secondaryRank = rank[secondary.severity] || 0;
  if (secondaryRank > primaryRank) return secondary;
  if (secondaryRank < primaryRank) return primary;
  return Number(secondary.confidence || 0) > Number(primary.confidence || 0) ? secondary : primary;
}

export async function moderateTextContent({ text = "", user = {}, context = {}, strict = true } = {}) {
  const hardDecision = hardRuleScan(text, context);
  let sightengineDecision = null;
  if (env.SIGHTENGINE_ENABLED) {
    try {
      sightengineDecision = await moderateSightengineText({ text, context });
    } catch (error) {
      if (env.NODE_ENV === "production") {
        console.log(`[SIGHTENGINE] Text moderation fallback: ${error.message}`);
      }
    }
  }
  const sightenginePrimary =
    /sightengine/i.test(env.DETECTION_PROVIDER) &&
    !/hybrid/i.test(`${env.DETECTION_PROVIDER} ${env.DECISION_PROVIDER}`);
  const sightengineClean = sightenginePrimary && sightengineDecision?.severity === "none";
  const prompt = buildTextModerationPrompt({ text, context, user, priorDecision: hardDecision });
  const backupModel = modelForTask("backup");
  const fastModel = modelForTask("textModeration");
  const reasoningModel = modelForTask("appeal");

  let modelDecision = null;
  if (env.OLLAMA_ENABLED && !sightengineClean && hardDecision.severity !== "critical") {
    modelDecision = await runJsonModeration({
      prompt,
      task: "textModeration",
      model: fastModel,
      fallbackModel: backupModel,
      timeoutMs: env.OLLAMA_TIMEOUT_MS,
      baseDecision: hardDecision,
    });
  }

  let strongest = mergeDecision(mergeDecision(hardDecision, sightengineDecision), modelDecision);

  if (env.OLLAMA_ENABLED && !sightengineClean && shouldUseReasoningPass(strongest, context, user)) {
    const reasoningPrompt = buildTextModerationPrompt({
      text,
      context: { ...context, secondPass: true },
      user,
      priorDecision: strongest,
    });
    const reasoningDecision = await runJsonModeration({
      prompt: reasoningPrompt,
      task: "appeal",
      model: reasoningModel,
      fallbackModel: backupModel,
      timeoutMs: env.OLLAMA_TIMEOUT_MS,
      baseDecision: strongest,
    });
    strongest = mergeDecision(strongest, reasoningDecision);
  }

  const recommendedAction = actionForDecision(strongest);
  const durationMinutes =
    recommendedAction === "temp_ban"
      ? Number(strongest.durationMinutes || env.BOT_CRITICAL_TEMP_BAN_MINUTES)
      : ["temp_mute", "restrict"].includes(recommendedAction)
        ? Number(strongest.durationMinutes || env.BOT_SPAM_MUTE_MINUTES)
        : 0;

  return {
    ...strongest,
    strict,
    allowed: strongest.severity === "none" || strongest.severity === "low",
    recommendedAction,
    durationMinutes,
    minutes: durationMinutes,
    reason: strongest.reasonStaff || strongest.reasonUser,
    reasonUser: strongest.reasonUser,
    reasonStaff: strongest.reasonStaff,
    provider:
      strongest.provider ||
      (strongest.modelUsed === "sightengine"
        ? "sightengine"
        : strongest.modelUsed && strongest.modelUsed !== "hard-rules"
          ? "ollama-router"
          : "hard-rules"),
    ruleVersion: strongest.ruleVersion || BOT_RULE_VERSION,
    promptVersion: strongest.promptVersion || BOT_PROMPT_VERSION,
  };
}
