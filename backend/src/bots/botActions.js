import { applyBotDecisionFor } from "../lib/localStore.js";

export async function applyBotAction(payload) {
  return applyBotDecisionFor(payload);
}
