import { getBotAdminDataFor } from "../lib/localStore.js";

export async function getBotModerationDashboard(userId) {
  return getBotAdminDataFor(userId);
}
