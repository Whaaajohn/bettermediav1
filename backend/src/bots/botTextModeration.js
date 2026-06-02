import { generateBotAction } from "../lib/localAi.js";
import { getBotEnvConfig } from "./botConfig.js";
import { actionForDecision } from "./botPolicy.js";
import { classifyWithRules } from "./providers/ruleProvider.js";
import { classifyWithHuggingFace } from "./providers/huggingfaceProvider.js";
import { classifyWithOllama } from "./providers/ollamaProvider.js";
import { moderateSightengineText } from "./services/sightengineService.js";
import { env } from "../config/env.js";

const severityWeight = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
const allowedBotActions = new Set([
  "log",
  "warn",
  "report",
  "escalate",
  "hide_content",
  "temp_mute",
  "restrict",
  "temp_ban",
]);

function strongerDecision(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;

  const currentWeight = severityWeight[current.severity] || 0;
  const candidateWeight = severityWeight[candidate.severity] || 0;
  if (candidateWeight > currentWeight) return candidate;
  if (candidateWeight < currentWeight) return current;

  return Number(candidate.confidence || 0) > Number(current.confidence || 0)
    ? candidate
    : current;
}

function cleanRecommendedAction(action) {
  const normalized = String(action || "").trim().toLowerCase().replace(/-/g, "_");
  return allowedBotActions.has(normalized) ? normalized : "";
}

export async function scanTextContent({ text = "", user = null, botTraining = {}, context = {} } = {}) {
  const config = getBotEnvConfig();
  const body = text.toString().slice(0, config.limits.textScanMaxLength);
  const ruleResult = await classifyWithRules(body);
  let sightengineResult = null;
  try {
    sightengineResult = await moderateSightengineText({ text: body, context });
  } catch (error) {
    console.log(`[SIGHTENGINE] Queue text scan fallback: ${error.message}`);
  }
  const sightenginePrimary =
    /sightengine/i.test(env.DETECTION_PROVIDER) &&
    !/hybrid/i.test(`${env.DETECTION_PROVIDER} ${env.DECISION_PROVIDER}`);
  const sightengineClean = sightenginePrimary && sightengineResult?.severity === "none";
  const shouldUseLocalReasoning = !sightengineClean || ruleResult.severity !== "none";

  const ollamaResult = shouldUseLocalReasoning && config.localAIEnabled
    ? await classifyWithOllama(body, {
        ...context,
        userId: user?._id,
        username: user?.username,
        botTraining,
      })
    : null;
  const aiResult =
    shouldUseLocalReasoning && !ollamaResult && ruleResult.severity === "none"
      ? await classifyWithHuggingFace(body)
      : null;
  const localAction = shouldUseLocalReasoning
    ? await generateBotAction({
        text: body,
        userName: user?.fullName || user?.username || "there",
        userId: user?._id || "unknown",
        botConfig: botTraining,
        context,
      })
    : {};

  const localDecision =
    localAction?.severity && localAction.severity !== "none"
      ? {
          category: localAction.moderation?.category || localAction.intent || ruleResult.category,
          severity: localAction.severity,
          confidence: localAction.confidence,
          reason:
            localAction.moderation?.modNote ||
            localAction.suggestedReport?.reason ||
            ruleResult.reason ||
            "Local bot safety match.",
          recommendedAction: localAction.recommendedAction || localAction.moderation?.suggestedAction,
          provider: "local-bot-rules",
        }
      : null;
  const candidates = sightengineClean
    ? [ruleResult, sightengineResult]
    : [ruleResult, sightengineResult, aiResult, ollamaResult, localDecision];
  const strongest = candidates.reduce(
    strongerDecision,
    null
  ) || ruleResult;
  const recommendedAction =
    cleanRecommendedAction(strongest.recommendedAction) ||
    actionForDecision({ ...strongest, recommendedAction: null });

  return {
    ...strongest,
    recommendedAction,
    minutes:
      recommendedAction === "temp_ban"
        ? strongest.minutes || config.limits.criticalTempBanMinutes
        : ["temp_mute", "restrict", "hide_content"].includes(recommendedAction)
          ? strongest.minutes || config.limits.spamMuteMinutes
          : 0,
    provider: strongest.provider || (strongest.model ? "local-model" : "rules"),
    shouldCreateReportDraft: localAction.shouldCreateReportDraft || strongest.severity === "high" || strongest.severity === "critical",
    shouldNotifyMods: localAction.shouldNotifyMods || strongest.severity === "critical",
    localAction,
  };
}
