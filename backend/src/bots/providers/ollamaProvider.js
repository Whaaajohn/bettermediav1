import { moderateTextContent } from "../services/botModerationService.js";

export async function classifyWithOllama(text = "", context = {}) {
  const body = String(text || "").slice(0, 4000);
  if (!body.trim()) return null;

  try {
    const decision = await moderateTextContent({
      text: body,
      user: {
        _id: context.userId,
        username: context.username,
        moderationRecords: context.userModerationRecords || [],
      },
      context,
    });
    return {
      category: decision.category,
      severity: decision.severity,
      confidence: decision.confidence,
      reason: decision.reasonStaff || decision.reason,
      reasonUser: decision.reasonUser,
      recommendedAction: decision.recommendedAction,
      minutes: decision.minutes || decision.durationMinutes || 0,
      model: decision.modelUsed,
      fallbackModel: decision.fallbackModelUsed,
      provider: decision.provider,
      ruleVersion: decision.ruleVersion,
      promptVersion: decision.promptVersion,
    };
  } catch {
    return null;
  }
}
