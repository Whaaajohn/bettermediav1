import { BOT_PROMPT_VERSION, BOT_RULE_VERSION } from "./botRulesService.js";

const policyBullets = [
  "No hate, severe slurs, harassment, threats, scams, doxxing, impersonation, spam, sexual exploitation, or ban evasion.",
  "Do not repeat slurs or private information in user-facing reasons.",
  "Reports may quote bad content. Moderate the reported target, not the reporter.",
  "Use short, professional user reasons and detailed staff-only reasons.",
  "Full bans, user deletion, admin changes, and audit-log deletion require admins and are never bot actions.",
];

export function buildTextModerationPrompt({ text = "", context = {}, user = {}, priorDecision = null } = {}) {
  return `
You are BetterMedia's strict local moderation model.
Return JSON only.

Rule version: ${BOT_RULE_VERSION}
Prompt version: ${BOT_PROMPT_VERSION}
Policy:
- ${policyBullets.join("\n- ")}

Context:
${JSON.stringify({
    source: context.source || context.eventType || "unknown",
    targetType: context.targetType || "content",
    reportContext: context.reportContext || "",
    userRole: user.role || "user",
    priorRestrictions: (user.moderationRecords || []).length,
    priorDecision,
  })}

Content:
${String(text || "").slice(0, 5000)}

Return exactly this schema:
{
  "allowed": true,
  "category": "none|spam|harassment|hate|slur|doxxing|threat|sexual|graphic|scam|privacy|policy|other",
  "severity": "none|low|medium|high|critical",
  "confidence": 0.0,
  "recommendedAction": "allow|log|warn|hide_content|quarantine|soft_remove|temp_mute|temp_restrict|temp_ban|admin_review",
  "durationMinutes": null,
  "reasonUser": "professional user-facing explanation",
  "reasonStaff": "detailed staff-only explanation",
  "evidenceSummary": "safe summary without repeating harmful details",
  "appealAllowed": true,
  "restoreEligible": true,
  "needsSecondPass": false
}
`.trim();
}

export function buildAppealPrompt({ appeal = {}, user = {}, originalDecision = null, content = "" } = {}) {
  return `
You are BetterMedia's appeal review model. Be fair, professional, and careful.
Return JSON only.

Rules:
- Appeals may be for a timed account restriction or for a ModBot action on a post, comment, or message.
- Approve when the bot was wrong, the violation is weak, or the action was too harsh.
- Decline clearly when the violation is obvious and the action was proportionate.
- Send serious, uncertain, full-ban, admin/mod, or safety-sensitive cases to admin_review.
- For content appeals, set restoreContent=true only when the content can safely come back.
- For restriction appeals, set removeRestriction=true only when the restriction should be cleared.
- Do not reveal staff-only details to the user.

User context:
${JSON.stringify({
    role: user.role || "user",
    moderationRecords: (user.moderationRecords || []).length,
    botWarningCount: user.botWarningCount || 0,
    botMuteCount: user.botMuteCount || 0,
    botTempBanCount: user.botTempBanCount || 0,
  })}

Original decision:
${JSON.stringify(originalDecision || {})}

Appeal:
${JSON.stringify(appeal || {})}

Content snapshot:
${String(content || "").slice(0, 5000)}

Return:
{
  "decision": "approve|decline|admin_review",
  "confidence": 0.0,
  "restoreContent": true,
  "removeRestriction": true,
  "reduceRestriction": false,
  "newDurationMinutes": null,
  "professionalReasonUser": "clear respectful explanation",
  "professionalReasonStaff": "detailed staff-only reasoning",
  "adminReviewNeeded": false
}
`.trim();
}

export function buildVisionPrompt({ caption = "", context = {} } = {}) {
  return `
You are BetterMedia's local vision moderation model.
Scan image safety and visible text. Return JSON only. Do not repeat private info or slurs.

Context:
${JSON.stringify(context || {})}

Caption:
${String(caption || "").slice(0, 1200)}

Return:
{
  "allowed": true,
  "category": "none|hate|slur|doxxing|privacy|sexual|graphic|threat|scam|spam|other",
  "severity": "none|low|medium|high|critical",
  "confidence": 0.0,
  "visibleTextSummary": "safe summary only",
  "recommendedAction": "allow|log|warn|quarantine|soft_remove|admin_review",
  "reasonUser": "professional user-facing explanation",
  "reasonStaff": "staff-only explanation",
  "needsSecondPass": false
}
`.trim();
}
