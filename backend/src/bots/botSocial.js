import { env } from "../config/env.js";

export function shouldBotReplySocially(eventType) {
  if (eventType === "follow") return env.BOT_THANK_FOLLOW_ENABLED;
  return false;
}
