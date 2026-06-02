import { env } from "../config/env.js";

const buckets = new Map();

export function botReplyAllowed(userId) {
  if (!userId) return true;
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const bucket = (buckets.get(userId) || []).filter((time) => now - time < windowMs);
  if (bucket.length >= env.BOT_MAX_REPLIES_PER_USER_PER_10_MIN) {
    buckets.set(userId, bucket);
    return false;
  }
  bucket.push(now);
  buckets.set(userId, bucket);
  return true;
}
