import { getBotEnvConfig } from "../botConfig.js";
import { loadHuggingFacePipeline } from "../botModelLoader.js";

export async function classifyWithHuggingFace(text = "") {
  const config = getBotEnvConfig();
  if (!config.localAIEnabled || !config.models.text) return null;

  const classifier = await loadHuggingFacePipeline("text-classification", config.models.text);
  if (!classifier) return null;

  const [result] = await classifier(text.slice(0, config.limits.textScanMaxLength));
  if (!result) return null;

  const negative = result.label?.toLowerCase().includes("negative");
  return {
    category: negative ? "tone" : "none",
    severity: negative && result.score > 0.95 ? "medium" : "none",
    confidence: Number(result.score || 0),
    reason: `Local Hugging Face classifier returned ${result.label}.`,
    model: config.models.text,
  };
}
