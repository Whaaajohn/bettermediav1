import { applyBotDecisionFor, reviewBotActionFor, undoBotActionFor } from "../../lib/localStore.js";

export function createBotAction(decision) {
  return applyBotDecisionFor(decision);
}

export function applyStoredBotAction(staffId, actionId, reason = "Approved by staff") {
  return reviewBotActionFor(staffId, actionId, { status: "approved", reason });
}

export function undoStoredBotAction(staffId, actionId, reason = "Undone by staff") {
  return undoBotActionFor(staffId, actionId, reason);
}

