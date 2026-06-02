export function fallbackClassification(text = "") {
  const value = text.toLowerCase();
  const hateSlur = /\b(n[i1!]+g{1,2}(?:er|a)|c[o0]{2}n|ch[i1!]nk|sp[i1!]c|k[i1!]ke|w[e3]tback|f[a@]g{1,2}[o0]t|tr[a@]nny)\b/i.test(value);
  const severe = /(kill yourself|dox|address is|credit card|password is|swat|bomb|shoot|stab)/i.test(value);
  const harassment = /(idiot|stupid|trash|ugly|hate you|go die)/i.test(value);
  const spam = /(free money|crypto pump|click this link|telegram me|cashapp|http:\/\/|https:\/\/)/i.test(value);

  if (hateSlur) {
    return {
      category: "hate",
      severity: "critical",
      confidence: 0.97,
      reason: "Severe hate slur detected.",
      recommendedAction: "temp_ban",
    };
  }
  if (severe) {
    return { category: "safety", severity: "critical", confidence: 0.92, reason: "Critical safety phrase detected." };
  }
  if (spam) {
    return { category: "spam", severity: "high", confidence: 0.82, reason: "Likely spam or scam pattern." };
  }
  if (harassment) {
    return { category: "harassment", severity: "medium", confidence: 0.68, reason: "Possible harassment language." };
  }
  return { category: "none", severity: "none", confidence: 0.2, reason: "No obvious issue detected." };
}
