import { env } from "../../config/env.js";
import { runOllamaGenerate } from "./ollamaClient.js";
import { modelForTask } from "./ollamaRouter.js";
import { extractJsonObject } from "./botJsonRepairService.js";
import { buildAppealPrompt } from "./botPromptService.js";
import { BOT_PROMPT_VERSION, BOT_RULE_VERSION } from "./botRulesService.js";

function normalizeAppealResult(result = {}) {
  const decision = ["approve", "decline", "admin_review"].includes(result.decision)
    ? result.decision
    : "admin_review";
  return {
    decision,
    confidence: Math.max(0, Math.min(1, Number(result.confidence || 0.4))),
    restoreContent: Boolean(result.restoreContent),
    removeRestriction: Boolean(result.removeRestriction),
    reduceRestriction: Boolean(result.reduceRestriction),
    newDurationMinutes: result.newDurationMinutes == null ? null : Number(result.newDurationMinutes),
    professionalReasonUser: String(result.professionalReasonUser || "Your appeal was reviewed.").slice(0, 800),
    professionalReasonStaff: String(result.professionalReasonStaff || "Appeal model review.").slice(0, 1200),
    adminReviewNeeded: decision === "admin_review" || Boolean(result.adminReviewNeeded),
    ruleVersion: BOT_RULE_VERSION,
    promptVersion: BOT_PROMPT_VERSION,
  };
}

export async function reviewAppealWithBot({ appeal = {}, user = {}, originalDecision = null, content = "" } = {}) {
  const prompt = buildAppealPrompt({ appeal, user, originalDecision, content });
  if (!env.OLLAMA_ENABLED) {
    return normalizeAppealResult({
      decision: "admin_review",
      confidence: 0,
      professionalReasonUser: "Your appeal needs staff review because local AI is offline.",
      professionalReasonStaff: "Ollama disabled or offline.",
      adminReviewNeeded: true,
    });
  }

  const first = await runOllamaGenerate({
    task: "appeal",
    model: modelForTask("appeal"),
    prompt,
    format: "json",
    temperature: 0.14,
    numPredict: 320,
    timeoutMs: env.OLLAMA_TIMEOUT_MS,
  });
  let parsed = first.ok ? extractJsonObject(first.response) : null;
  let fallback = null;
  if (!parsed) {
    fallback = await runOllamaGenerate({
      task: "appeal",
      model: modelForTask("backup"),
      prompt,
      format: "json",
      temperature: 0.08,
      numPredict: 320,
      timeoutMs: env.OLLAMA_TIMEOUT_MS,
    });
    parsed = fallback.ok ? extractJsonObject(fallback.response) : null;
  }

  return {
    ...normalizeAppealResult(parsed || {}),
    modelUsed: first.modelUsed,
    fallbackModelUsed: fallback?.modelUsed || null,
    provider: parsed ? "ollama-appeal" : "admin-review-fallback",
  };
}

