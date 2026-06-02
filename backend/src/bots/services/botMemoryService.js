import { deleteBotMemoryFor, getBotMemoryFor } from "../../lib/localStore.js";

export function getUserBotMemory(userId) {
  return getBotMemoryFor(userId);
}

export function clearUserBotMemory(userId) {
  return deleteBotMemoryFor(userId);
}

