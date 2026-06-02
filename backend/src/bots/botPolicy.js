import { getBotEnvConfig } from "./botConfig.js";
import { canBotPerform, normalizeActionName } from "./botPermissions.js";

const severityRank = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function severityScore(severity = "none") {
  return severityRank[severity] || 0;
}

export function actionForDecision(decision = {}, fallback = {}) {
  const config = getBotEnvConfig();
  const severity = decision.severity || fallback.severity || "none";
  const suggested = decision.recommendedAction || fallback.recommendedAction;
  const action = normalizeActionName(
    suggested ||
      (severity === "critical"
        ? config.actions.critical
        : severity === "high"
          ? config.actions.high
          : severity === "medium"
            ? config.actions.medium
            : config.actions.low)
  );

  if (!canBotPerform(action)) return "log";
  return action;
}

export function shouldEscalateDecision(decision = {}) {
  return severityScore(decision.severity) >= 3 || decision.shouldNotifyMods === true;
}
