import { applyBotDecisionFor } from "../lib/localStore.js";

export async function recordBotDecision(payload) {
  return applyBotDecisionFor(payload);
}
