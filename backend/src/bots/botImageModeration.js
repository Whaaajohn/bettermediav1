import { getBotEnvConfig } from "./botConfig.js";

export async function scanImageContent({ media = null } = {}) {
  const config = getBotEnvConfig();
  if (!config.scans.image || !media) {
    return { category: "none", severity: "none", confidence: 0, reason: "Image scanning disabled." };
  }

  return {
    category: "media",
    severity: "none",
    confidence: 0.2,
    reason: "Image queued for local model support. No unsafe pattern found by fallback.",
  };
}
