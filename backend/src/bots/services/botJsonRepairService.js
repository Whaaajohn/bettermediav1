export function extractJsonObject(text = "") {
  const clean = String(text || "").trim();
  if (!clean) return null;

  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export function normalizeModerationDecision(input = {}, fallback = {}) {
  const allowedCategories = new Set([
    "none",
    "spam",
    "harassment",
    "hate",
    "slur",
    "doxxing",
    "threat",
    "sexual",
    "graphic",
    "scam",
    "privacy",
    "policy",
    "bug",
    "other",
  ]);
  const allowedSeverities = new Set(["none", "low", "medium", "high", "critical"]);
  const allowedActions = new Set([
    "allow",
    "log",
    "warn",
    "hide_content",
    "quarantine",
    "soft_remove",
    "temp_mute",
    "temp_restrict",
    "restrict",
    "temp_ban",
    "admin_review",
  ]);

  const category = String(input.category || fallback.category || "none").toLowerCase().replace(/\s+/g, "_");
  const severity = String(input.severity || fallback.severity || "none").toLowerCase();
  const action = String(input.recommendedAction || input.action || fallback.recommendedAction || "log")
    .toLowerCase()
    .replace(/-/g, "_");
  const safeSeverity = allowedSeverities.has(severity) ? severity : "none";
  const safeCategory = allowedCategories.has(category) ? category : "other";
  const safeAction = safeSeverity === "none" ? "log" : allowedActions.has(action) ? action : "admin_review";

  return {
    allowed: input.allowed !== undefined ? Boolean(input.allowed) : safeSeverity === "none" || safeSeverity === "low",
    category: safeSeverity === "none" ? "none" : safeCategory,
    severity: safeSeverity,
    confidence: Math.max(0, Math.min(1, Number(input.confidence ?? fallback.confidence ?? 0.4))),
    recommendedAction: safeAction,
    durationMinutes:
      safeAction === "temp_ban"
        ? Number(input.durationMinutes ?? input.minutes ?? fallback.durationMinutes ?? 1440)
        : ["temp_mute", "temp_restrict", "restrict"].includes(safeAction)
          ? Number(input.durationMinutes ?? input.minutes ?? fallback.durationMinutes ?? 15)
          : null,
    reasonUser: String(input.reasonUser || fallback.reasonUser || "BetterMedia safety rules flagged this.").slice(0, 500),
    reasonStaff: String(input.reasonStaff || fallback.reasonStaff || input.reason || "Model moderation decision.").slice(0, 900),
    evidenceSummary: String(input.evidenceSummary || fallback.evidenceSummary || "").slice(0, 500),
    appealAllowed: input.appealAllowed !== false,
    restoreEligible: input.restoreEligible !== false,
    needsSecondPass: Boolean(input.needsSecondPass),
  };
}

