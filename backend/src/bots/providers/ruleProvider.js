import { fallbackClassification } from "../botModelFallbacks.js";

export async function classifyWithRules(text) {
  return fallbackClassification(text);
}
