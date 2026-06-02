export const BOT_RULE_VERSION = "bettermedia-rules-v4.0.0";
export const BOT_PROMPT_VERSION = "bettermedia-prompts-v4.0.0";

const slurPattern =
  /\b(n[i1!]+g{1,2}(?:er|a)|c[o0]{2}n|ch[i1!]nk|sp[i1!]c|k[i1!]ke|w[e3]tback|sand\s*n[i1!]+g|f[a@]g{1,2}[o0]t|tr[a@]nny)\b/i;
const threatPattern = /\b(kill you|i will kill|shoot you|stab you|swat you|bomb threat|pull up and kill|violent threat)\b/i;
const selfHarmAttackPattern = /\b(kill yourself|kys|go die)\b/i;
const codeTheftPattern = /\b(send|give|share).{0,24}(login code|verification code|reset code|gmail code|password)\b/i;
const doxxingPattern =
  /\b(drop|leak|post|expose).{0,32}(address|phone number|ip address|private info|personal info|real address)\b/i;
const privateInfoPattern =
  /(?:\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{1,3}(?:\.\d{1,3}){3}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;
const spamPattern = /\b(free money|crypto pump|double your money|telegram me|cashapp|click this link|giveaway)\b/i;
const linkPattern = /(https?:\/\/|www\.)/gi;
const harassmentPattern = /\b(idiot|stupid|trash|ugly|hate you|worthless|loser)\b/i;

export function safeEvidenceSummary(text = "", max = 220) {
  return String(text || "")
    .replace(slurPattern, "[slur]")
    .replace(privateInfoPattern, "[private info]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function baseDecision(overrides = {}) {
  const severity = overrides.severity || "none";
  const action =
    overrides.recommendedAction ||
    (severity === "critical"
      ? "temp_ban"
      : severity === "high"
        ? "temp_mute"
        : severity === "medium"
          ? "warn"
          : "log");

  return {
    allowed: severity === "none" || severity === "low",
    category: overrides.category || "none",
    severity,
    confidence: Number(overrides.confidence ?? 0.2),
    recommendedAction: action,
    durationMinutes: overrides.durationMinutes ?? (action === "temp_ban" ? 1440 : action === "temp_mute" ? 15 : null),
    reasonUser: overrides.reasonUser || "This was checked against BetterMedia safety rules.",
    reasonStaff: overrides.reasonStaff || "Local rules did not find a serious violation.",
    evidenceSummary: overrides.evidenceSummary || "",
    appealAllowed: overrides.appealAllowed !== false,
    restoreEligible: overrides.restoreEligible !== false,
    needsSecondPass: Boolean(overrides.needsSecondPass),
    modelUsed: overrides.modelUsed || "hard-rules",
    fallbackModelUsed: overrides.fallbackModelUsed || null,
    ruleVersion: BOT_RULE_VERSION,
    promptVersion: BOT_PROMPT_VERSION,
  };
}

export function hardRuleScan(text = "", context = {}) {
  const body = String(text || "");
  const evidenceSummary = safeEvidenceSummary(body);
  const linkCount = (body.match(linkPattern) || []).length;

  if (!body.trim()) return baseDecision({ evidenceSummary, confidence: 0.1 });

  if (slurPattern.test(body)) {
    return baseDecision({
      category: "hate",
      severity: "critical",
      confidence: 0.98,
      recommendedAction: "temp_ban",
      durationMinutes: 1440,
      reasonUser: "Your account was temporarily banned for severe hate speech.",
      reasonStaff: "Hard rule matched a severe hate slur. Do not repeat the slur in user-facing text.",
      evidenceSummary,
    });
  }

  if (threatPattern.test(body)) {
    return baseDecision({
      category: "threat",
      severity: "critical",
      confidence: 0.96,
      recommendedAction: "temp_ban",
      durationMinutes: 1440,
      reasonUser: "Your account was temporarily banned for a serious threat.",
      reasonStaff: "Hard rule matched a direct violent threat.",
      evidenceSummary,
    });
  }

  if (selfHarmAttackPattern.test(body)) {
    return baseDecision({
      category: "harassment",
      severity: "critical",
      confidence: 0.94,
      recommendedAction: "temp_ban",
      durationMinutes: 1440,
      reasonUser: "Your account was temporarily banned for abusive safety-related harassment.",
      reasonStaff: "Hard rule matched self-harm encouragement or severe harassment.",
      evidenceSummary,
    });
  }

  if (codeTheftPattern.test(body)) {
    return baseDecision({
      category: "scam",
      severity: "critical",
      confidence: 0.96,
      recommendedAction: "temp_ban",
      durationMinutes: 1440,
      reasonUser: "Your account was temporarily banned for trying to collect private login information.",
      reasonStaff: "Hard rule matched account-code or password theft.",
      evidenceSummary,
    });
  }

  if (doxxingPattern.test(body)) {
    return baseDecision({
      category: "doxxing",
      severity: "critical",
      confidence: 0.95,
      recommendedAction: "temp_ban",
      durationMinutes: 1440,
      reasonUser: "Your account was temporarily banned for threatening to share private information.",
      reasonStaff: "Hard rule matched a doxxing/private-information threat.",
      evidenceSummary,
    });
  }

  if (privateInfoPattern.test(body) && context.source !== "appeal") {
    return baseDecision({
      category: "privacy",
      severity: "high",
      confidence: 0.86,
      recommendedAction: "temp_mute",
      durationMinutes: 60,
      reasonUser: "This may expose private information, so BetterMedia limited the content for review.",
      reasonStaff: "Hard rule found possible private information.",
      evidenceSummary,
      needsSecondPass: true,
    });
  }

  if (spamPattern.test(body) || linkCount >= 3) {
    return baseDecision({
      category: "spam",
      severity: "high",
      confidence: 0.84,
      recommendedAction: "temp_mute",
      durationMinutes: 15,
      reasonUser: "Your messaging was temporarily limited for spam or scam-like content.",
      reasonStaff: "Hard rule matched spam/scam language or too many links.",
      evidenceSummary,
    });
  }

  if (harassmentPattern.test(body)) {
    return baseDecision({
      category: "harassment",
      severity: "medium",
      confidence: 0.7,
      recommendedAction: "warn",
      reasonUser: "Please keep BetterMedia respectful. This looked like harassment.",
      reasonStaff: "Hard rule matched possible harassment.",
      evidenceSummary,
    });
  }

  return baseDecision({ evidenceSummary, confidence: 0.2 });
}

export function shouldUseReasoningPass(decision = {}, context = {}, user = {}) {
  if (context.source === "appeal" || context.eventType === "appeal") return true;
  if (decision.needsSecondPass) return true;
  if (decision.recommendedAction === "temp_ban") return true;
  if (["high", "critical"].includes(decision.severity)) return true;
  if (Number(decision.confidence || 0) < 0.75 && decision.severity !== "none") return true;
  if ((user.moderationRecords || []).length > 0 && decision.severity !== "none") return true;
  return false;
}

