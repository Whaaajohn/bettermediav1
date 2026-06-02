import crypto from "crypto";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { getMemoryStore, getRedisClient } from "../config/redis.js";

const AUTH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/login/verify-code",
  "/api/auth/login/resend-code",
]);

function hashValue(value = "") {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 18);
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "local";
}

function tokenPayload(req) {
  const token = req.cookies?.[env.COOKIE_NAME] || req.cookies?.jwt;
  if (!token) return null;

  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

function routeScope(req, fallback = "api") {
  const pathname = (req.originalUrl || req.url || "").split("?")[0];
  if (AUTH_PATHS.has(pathname)) return "auth_login";
  if (pathname.startsWith("/api/chat/")) return "message";
  if (pathname.startsWith("/api/uploads")) return "upload";
  if (pathname.startsWith("/api/posts/") && pathname.includes("/comments")) return "comment";
  if (pathname.startsWith("/api/posts")) return "post";
  if (pathname.startsWith("/api/feed")) return "feed";
  return fallback;
}

function limitForScope(scope, fallbackMax) {
  if (scope === "auth_login") return env.AUTH_RATE_LIMIT_MAX;
  if (scope === "message") return env.MESSAGE_RATE_LIMIT_MAX;
  if (scope === "upload") return env.UPLOAD_RATE_LIMIT_MAX;
  if (scope === "post" || scope === "comment") return env.POST_RATE_LIMIT_MAX;
  return fallbackMax || env.RATE_LIMIT_MAX;
}

export function getRateLimitKey(req, scope = "api") {
  const payload = tokenPayload(req);
  const userId = req.user?._id || req.user?.id || payload?.userId || payload?.id;
  const sessionId =
    req.user?.sessionId ||
    payload?.sessionId ||
    req.cookies?.bm_device ||
    req.headers["x-device-id"];
  const ip = clientIp(req);
  const uaHash = hashValue(req.headers["user-agent"] || "unknown");

  if (scope === "auth_login") return `auth:login:ip:${ip}:ua:${uaHash}`;
  if (userId && sessionId) return `${scope}:user:${userId}:session:${sessionId}`;
  if (userId) return `${scope}:user:${userId}`;
  if (sessionId) return `${scope}:device:${sessionId}:ip:${ip}`;
  return `${scope}:anon:ip:${ip}:ua:${uaHash}`;
}

async function incrementRedis(key, windowMs) {
  const client = getRedisClient();
  if (!client?.isOpen) return null;

  try {
    const count = await client.incr(key);
    if (count === 1) await client.pExpire(key, windowMs);
    const ttl = await client.pTTL(key);
    return {
      count,
      resetAt: Date.now() + Math.max(ttl, 0),
    };
  } catch (error) {
    console.log(`[LOCAL RATE] Redis fallback active: ${error.message}`);
    return null;
  }
}

function incrementMemory(key, windowMs) {
  const store = getMemoryStore();
  const now = Date.now();
  const entry = store.get(key) || { count: 0, resetAt: now + windowMs };

  if (entry.resetAt <= now) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count += 1;
  store.set(key, entry);

  return entry;
}

export function localRateLimit({
  bucket = "api",
  max = env.RATE_LIMIT_MAX,
  windowMs = env.RATE_LIMIT_WINDOW_MS,
} = {}) {
  return async (req, res, next) => {
    if (!env.RATE_LIMIT_ENABLED) return next();
    if (env.RATE_LIMIT_BYPASS_ADMIN && req.user?.isAdmin) return next();

    const scope = routeScope(req, bucket);
    const effectiveMax = limitForScope(scope, max);
    const key = getRateLimitKey(req, scope);
    const redisKey = `${env.REDIS_PREFIX}rate:${key}`;
    const entry = (await incrementRedis(redisKey, windowMs)) || incrementMemory(redisKey, windowMs);
    const retryAfterMs = Math.max(0, entry.resetAt - Date.now());

    res.setHeader("X-RateLimit-Limit", String(effectiveMax));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, effectiveMax - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > effectiveMax) {
      res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
      return res.status(429).json({
        error: "rate_limited",
        message: "Too many requests. Try again soon.",
        retryAfterMs,
      });
    }

    return next();
  };
}
