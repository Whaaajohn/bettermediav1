import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  override: true,
});

const booleanValue = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const numberValue = (value, fallback) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const listValue = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  LOCAL_DEV: booleanValue(process.env.LOCAL_DEV, process.env.NODE_ENV !== "production"),
  PORT: numberValue(process.env.PORT, 5174),
  ADMIN_PORT: numberValue(process.env.ADMIN_PORT, 5175),
  HOST: process.env.HOST || "127.0.0.1",
  API_BASE_URL: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5174}`,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  CORS_ORIGINS: listValue(process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || ""),

  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || "local-dev-secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  COOKIE_NAME: process.env.COOKIE_NAME || "jwt",
  COOKIE_SECURE: booleanValue(process.env.COOKIE_SECURE, process.env.NODE_ENV === "production"),
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || "lax",
  BCRYPT_ROUNDS: numberValue(process.env.BCRYPT_ROUNDS, 10),

  DB_DRIVER: process.env.DB_DRIVER || (process.env.MONGO_URI ? "mongo" : "local_json"),
  MONGO_URI: process.env.MONGO_URI || "",
  MONGO_MODE: process.env.MONGO_MODE || "",
  MONGO_MIGRATE_FROM_LOCAL_JSON: booleanValue(process.env.MONGO_MIGRATE_FROM_LOCAL_JSON, false),
  LOCAL_DB_FILE: process.env.LOCAL_DB_FILE || "./data/db.json",
  AUTO_BACKUP_DB: booleanValue(process.env.AUTO_BACKUP_DB, true),
  DB_BACKUP_DIR: process.env.DB_BACKUP_DIR || "./data/backups",
  DB_WRITE_MODE: process.env.DB_WRITE_MODE || "queued",

  REDIS_ENABLED: booleanValue(process.env.REDIS_ENABLED, false),
  REDIS_REQUIRED: booleanValue(process.env.REDIS_REQUIRED, process.env.NODE_ENV === "production"),
  REDIS_URL: process.env.REDIS_URL || "",
  REDIS_PREFIX: process.env.REDIS_PREFIX || "bettermedia:",
  USE_REDIS_SOCKET_ADAPTER: booleanValue(process.env.USE_REDIS_SOCKET_ADAPTER ?? process.env.REDIS_SOCKET_ADAPTER, false),
  REDIS_SOCKET_ADAPTER: booleanValue(process.env.REDIS_SOCKET_ADAPTER ?? process.env.USE_REDIS_SOCKET_ADAPTER, false),
  REDIS_RATE_LIMITS: booleanValue(process.env.REDIS_RATE_LIMITS, true),
  REDIS_QUEUES: booleanValue(process.env.REDIS_QUEUES, true),

  EMAIL_ENABLED: booleanValue(process.env.EMAIL_ENABLED ?? process.env.SMTP_ENABLED, Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)),
  SMTP_ENABLED: booleanValue(process.env.SMTP_ENABLED ?? process.env.EMAIL_ENABLED, Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)),
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: numberValue(process.env.SMTP_PORT, 587),
  SMTP_SECURE: booleanValue(process.env.SMTP_SECURE, false),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_APP_NAME: process.env.SMTP_APP_NAME || process.env.MAIL_FROM_NAME || "Better Media",
  SMTP_TIMEOUT_MS: numberValue(process.env.SMTP_TIMEOUT_MS, 15000),
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || process.env.MAIL_FROM_NAME || "Better Media",
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || "",
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || "Better Media",
  MAIL_FROM_EMAIL: process.env.MAIL_FROM_EMAIL || "no-reply@bettermedia.local",
  DEV_PRINT_EMAIL_CODES: booleanValue(process.env.DEV_PRINT_EMAIL_CODES, true),
  LOGIN_ALERT_EMAILS: booleanValue(process.env.LOGIN_ALERT_EMAILS, true),
  LOGIN_ALERT_TRUSTED_DEVICE_SKIP: booleanValue(process.env.LOGIN_ALERT_TRUSTED_DEVICE_SKIP, false),

  GOOGLE_AUTH_ENABLED: booleanValue(process.env.GOOGLE_AUTH_ENABLED, false),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${process.env.PORT || 5174}/api/auth/google/callback`,
  APPLE_AUTH_ENABLED: booleanValue(process.env.APPLE_AUTH_ENABLED, false),
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID || "",
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID || "",
  APPLE_KEY_ID: process.env.APPLE_KEY_ID || "",
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY || "",
  APPLE_CALLBACK_URL: process.env.APPLE_CALLBACK_URL || "",

  UPLOAD_DRIVER: process.env.UPLOAD_DRIVER || (process.env.DB_DRIVER === "mongo" ? "mongo" : "local"),
  LOCAL_UPLOAD_DIR: process.env.LOCAL_UPLOAD_DIR || "./uploads",
  PUBLIC_UPLOAD_URL: process.env.PUBLIC_UPLOAD_URL || `http://localhost:${process.env.PORT || 5174}/uploads`,
  MAX_UPLOAD_MB: numberValue(process.env.MAX_UPLOAD_MB, 250),
  S3_ENABLED: booleanValue(process.env.S3_ENABLED, false),
  S3_ENDPOINT: process.env.S3_ENDPOINT || "",
  S3_REGION: process.env.S3_REGION || "",
  S3_BUCKET: process.env.S3_BUCKET || "",
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || "",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || "",
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL || "",
  CLOUDFLARE_R2_ENABLED: booleanValue(process.env.CLOUDFLARE_R2_ENABLED, false),
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "",
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "",
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "",
  R2_BUCKET: process.env.R2_BUCKET || "",
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "",

  RATE_LIMIT_ENABLED: booleanValue(process.env.RATE_LIMIT_ENABLED, true),
  RATE_LIMIT_WINDOW_MS: numberValue(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  RATE_LIMIT_MAX: numberValue(process.env.RATE_LIMIT_MAX, 120),
  AUTH_RATE_LIMIT_MAX: numberValue(process.env.AUTH_RATE_LIMIT_MAX, 20),
  POST_RATE_LIMIT_MAX: numberValue(process.env.POST_RATE_LIMIT_MAX, 30),
  MESSAGE_RATE_LIMIT_MAX: numberValue(process.env.MESSAGE_RATE_LIMIT_MAX, 80),
  UPLOAD_RATE_LIMIT_MAX: numberValue(process.env.UPLOAD_RATE_LIMIT_MAX, 20),
  RATE_LIMIT_BYPASS_ADMIN: booleanValue(process.env.RATE_LIMIT_BYPASS_ADMIN, false),
  ENABLE_HELMET: booleanValue(process.env.ENABLE_HELMET, true),
  ENABLE_COMPRESSION: booleanValue(process.env.ENABLE_COMPRESSION, true),
  TRUST_PROXY: booleanValue(process.env.TRUST_PROXY, false),

  MODERATION_ENABLED: booleanValue(process.env.MODERATION_ENABLED, true),
  AUTO_SPAM_DETECTION: booleanValue(process.env.AUTO_SPAM_DETECTION, true),
  DETECTION_PROVIDER: process.env.DETECTION_PROVIDER || (process.env.SIGHTENGINE_ENABLED === "true" ? "sightengine" : "rules_ollama"),
  DECISION_PROVIDER: process.env.DECISION_PROVIDER || (process.env.SIGHTENGINE_ENABLED === "true" ? "sightengine_thresholds" : "rules_ollama"),
  APPEAL_REVIEWER: process.env.APPEAL_REVIEWER || (process.env.OLLAMA_ENABLED === "false" ? "admin_review" : "ollama_reasoning"),
  SIGHTENGINE_ENABLED: booleanValue(process.env.SIGHTENGINE_ENABLED, false),
  SIGHTENGINE_API_USER: process.env.SIGHTENGINE_API_USER || "",
  SIGHTENGINE_API_SECRET: process.env.SIGHTENGINE_API_SECRET || "",
  SIGHTENGINE_TIMEOUT_MS: numberValue(process.env.SIGHTENGINE_TIMEOUT_MS, 20000),
  SIGHTENGINE_STRICTNESS: process.env.SIGHTENGINE_STRICTNESS || "medium",
  SIGHTENGINE_TEXT_MODE: process.env.SIGHTENGINE_TEXT_MODE || "ml,rules",
  SIGHTENGINE_TEXT_ENDPOINT: process.env.SIGHTENGINE_TEXT_ENDPOINT || "https://api.sightengine.com/1.0/text/check.json",
  SIGHTENGINE_IMAGE_ENDPOINT: process.env.SIGHTENGINE_IMAGE_ENDPOINT || "https://api.sightengine.com/1.0/check.json",
  SIGHTENGINE_MODELS:
    process.env.SIGHTENGINE_MODELS ||
    "nudity-2.1,weapon,gore,offensive,scam,text-content,face-attributes",
  MAX_HASHTAGS_PER_POST: numberValue(process.env.MAX_HASHTAGS_PER_POST, 10),
  MAX_POST_LENGTH: numberValue(process.env.MAX_POST_LENGTH, 2000),
  MAX_COMMENT_LENGTH: numberValue(process.env.MAX_COMMENT_LENGTH, 1000),
  BOT_ENGINE_ENABLED: booleanValue(process.env.BOT_ENGINE_ENABLED, true),
  BOT_LOCAL_AI_ENABLED: booleanValue(process.env.BOT_LOCAL_AI_ENABLED, true),
  BOT_SCAN_POSTS: booleanValue(process.env.BOT_SCAN_POSTS, true),
  BOT_SCAN_COMMENTS: booleanValue(process.env.BOT_SCAN_COMMENTS, true),
  BOT_SCAN_MESSAGES: booleanValue(process.env.BOT_SCAN_MESSAGES, true),
  BOT_SCAN_IMAGES: booleanValue(process.env.BOT_SCAN_IMAGES, false),
  BOT_SCAN_REPORTS: booleanValue(process.env.BOT_SCAN_REPORTS, true),
  BOT_SCAN_APPEALS: booleanValue(process.env.BOT_SCAN_APPEALS, true),
  BOT_TEXT_MODEL: process.env.BOT_TEXT_MODEL || "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
  BOT_MULTILINGUAL_TEXT_MODEL: process.env.BOT_MULTILINGUAL_TEXT_MODEL || "Xenova/bert-base-multilingual-uncased",
  BOT_REPLY_MODEL: process.env.BOT_REPLY_MODEL || process.env.HF_LOCAL_MODEL || "Xenova/distilgpt2",
  BOT_IMAGE_MODEL: process.env.BOT_IMAGE_MODEL || "",
  BOT_LOCAL_FILES_ONLY: booleanValue(process.env.BOT_LOCAL_FILES_ONLY, true),
  BOT_MODEL_CACHE_DIR: process.env.BOT_MODEL_CACHE_DIR || "./data/models",
  LOCAL_AI_ENABLED: booleanValue(process.env.LOCAL_AI_ENABLED, true),
  LOCAL_AI_HF_ENABLED: booleanValue(process.env.LOCAL_AI_HF_ENABLED, true),
  HF_LOCAL_MODEL: process.env.HF_LOCAL_MODEL || process.env.BOT_REPLY_MODEL || "Xenova/distilgpt2",
  HF_LOCAL_FILES_ONLY: booleanValue(process.env.HF_LOCAL_FILES_ONLY, true),
  HF_HOME: process.env.HF_HOME || process.env.BOT_MODEL_CACHE_DIR || "./data/models",
  OLLAMA_ENABLED: booleanValue(process.env.OLLAMA_ENABLED, true),
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || process.env.OLLAMA_TEXT_MODEL || "qwen2.5:3b",
  OLLAMA_TEXT_MODEL: process.env.OLLAMA_TEXT_MODEL || process.env.OLLAMA_MODEL || "qwen2.5:3b",
  OLLAMA_FAST_CHAT_MODEL: process.env.OLLAMA_FAST_CHAT_MODEL || process.env.OLLAMA_TEXT_MODEL || "qwen2.5:3b",
  OLLAMA_APPEAL_MODEL: process.env.OLLAMA_APPEAL_MODEL || "phi4-mini:latest",
  OLLAMA_VISION_ENABLED: booleanValue(process.env.OLLAMA_VISION_ENABLED, true),
  OLLAMA_VISION_MODEL: process.env.OLLAMA_VISION_MODEL || "qwen2.5vl:3b",
  OLLAMA_STRONG_VISION_MODEL: process.env.OLLAMA_STRONG_VISION_MODEL || "llama3.2-vision:latest",
  OLLAMA_BACKUP_MODEL: process.env.OLLAMA_BACKUP_MODEL || "gemma3:4b",
  OLLAMA_TIMEOUT_MS: numberValue(process.env.OLLAMA_TIMEOUT_MS, 25000),
  OLLAMA_VISION_TIMEOUT_MS: numberValue(process.env.OLLAMA_VISION_TIMEOUT_MS, 30000),
  OLLAMA_MAX_CONTEXT_CHARS: numberValue(process.env.OLLAMA_MAX_CONTEXT_CHARS, 12000),
  OLLAMA_MODERATION_STRICTNESS: process.env.OLLAMA_MODERATION_STRICTNESS || "high",
  OLLAMA_AUTO_ACTIONS: booleanValue(process.env.OLLAMA_AUTO_ACTIONS, true),
  OLLAMA_CAN_HIDE_CONTENT: booleanValue(process.env.OLLAMA_CAN_HIDE_CONTENT, true),
  OLLAMA_CAN_SOFT_REMOVE_CONTENT: booleanValue(process.env.OLLAMA_CAN_SOFT_REMOVE_CONTENT, true),
  OLLAMA_CAN_TEMP_MUTE: booleanValue(process.env.OLLAMA_CAN_TEMP_MUTE, true),
  OLLAMA_CAN_TEMP_RESTRICT: booleanValue(process.env.OLLAMA_CAN_TEMP_RESTRICT, true),
  OLLAMA_CAN_TEMP_BAN: booleanValue(process.env.OLLAMA_CAN_TEMP_BAN, true),
  OLLAMA_CAN_RESTORE_CONTENT: booleanValue(process.env.OLLAMA_CAN_RESTORE_CONTENT, true),
  OLLAMA_REQUIRE_ADMIN_FOR_FULL_BAN: booleanValue(process.env.OLLAMA_REQUIRE_ADMIN_FOR_FULL_BAN, true),
  OLLAMA_REQUIRE_ADMIN_FOR_DELETE_USER: booleanValue(process.env.OLLAMA_REQUIRE_ADMIN_FOR_DELETE_USER, true),
  OLLAMA_REQUIRE_ADMIN_FOR_ADMIN_CHANGES: booleanValue(process.env.OLLAMA_REQUIRE_ADMIN_FOR_ADMIN_CHANGES, true),
  OLLAMA_MEMORY_ENABLED: booleanValue(process.env.OLLAMA_MEMORY_ENABLED, true),
  OLLAMA_SOCIAL_MODE: booleanValue(process.env.OLLAMA_SOCIAL_MODE, true),
  OLLAMA_SOCIAL_COMMENTS_ENABLED: booleanValue(process.env.OLLAMA_SOCIAL_COMMENTS_ENABLED, false),
  OLLAMA_SOCIAL_COMMENTS_VERIFIED_ONLY: booleanValue(process.env.OLLAMA_SOCIAL_COMMENTS_VERIFIED_ONLY, true),
  OLLAMA_TEMPERATURE: numberValue(process.env.OLLAMA_TEMPERATURE, 0.35),
  OLLAMA_NUM_PREDICT: numberValue(process.env.OLLAMA_NUM_PREDICT, 120),
  BOT_QUEUE_CONCURRENCY: numberValue(process.env.BOT_QUEUE_CONCURRENCY, 1),
  BOT_QUEUE_MAX_PENDING: numberValue(process.env.BOT_QUEUE_MAX_PENDING, 200),
  BOT_QUEUE_DROP_LOW_PRIORITY_WHEN_FULL: booleanValue(process.env.BOT_QUEUE_DROP_LOW_PRIORITY_WHEN_FULL, true),
  BOT_CACHE_TTL_MS: numberValue(process.env.BOT_CACHE_TTL_MS, 300000),
  BOT_TEXT_SCAN_MAX_LENGTH: numberValue(process.env.BOT_TEXT_SCAN_MAX_LENGTH, 4000),
  BOT_IMAGE_SCAN_MAX_MB: numberValue(process.env.BOT_IMAGE_SCAN_MAX_MB, 8),
  BOT_AI_CONCURRENCY: numberValue(process.env.BOT_AI_CONCURRENCY, 1),
  BOT_FAST_PATH_ENABLED: booleanValue(process.env.BOT_FAST_PATH_ENABLED, true),
  BOT_ACTION_COOLDOWN_MS: numberValue(process.env.BOT_ACTION_COOLDOWN_MS, 30000),
  BOT_MAX_ACTIONS_PER_USER_PER_HOUR: numberValue(process.env.BOT_MAX_ACTIONS_PER_USER_PER_HOUR, 12),
  BOT_MAX_WARNINGS_BEFORE_MUTE: numberValue(process.env.BOT_MAX_WARNINGS_BEFORE_MUTE, 3),
  BOT_MAX_MUTES_BEFORE_ADMIN_REVIEW: numberValue(process.env.BOT_MAX_MUTES_BEFORE_ADMIN_REVIEW, 2),
  BOT_MAX_MUTE_MINUTES: numberValue(process.env.BOT_MAX_MUTE_MINUTES, 60),
  BOT_SPAM_MUTE_MINUTES: numberValue(process.env.BOT_SPAM_MUTE_MINUTES, 15),
  BOT_MAX_TEMP_BAN_MINUTES: numberValue(process.env.BOT_MAX_TEMP_BAN_MINUTES, 1440),
  BOT_CRITICAL_TEMP_BAN_MINUTES: numberValue(process.env.BOT_CRITICAL_TEMP_BAN_MINUTES, 1440),
  BOT_LOW_CONFIDENCE_ACTION: process.env.BOT_LOW_CONFIDENCE_ACTION || "log",
  BOT_MEDIUM_CONFIDENCE_ACTION: process.env.BOT_MEDIUM_CONFIDENCE_ACTION || "warn",
  BOT_HIGH_CONFIDENCE_ACTION: process.env.BOT_HIGH_CONFIDENCE_ACTION || "temp_mute",
  BOT_CRITICAL_CONFIDENCE_ACTION: process.env.BOT_CRITICAL_CONFIDENCE_ACTION || "temp_ban",
  BOT_RANDOM_COMMENT_ENABLED: booleanValue(process.env.BOT_RANDOM_COMMENT_ENABLED, false),
  BOT_MAX_RANDOM_COMMENTS_PER_HOUR: numberValue(process.env.BOT_MAX_RANDOM_COMMENTS_PER_HOUR, 2),
  BOT_MAX_REPLIES_PER_USER_PER_10_MIN: numberValue(process.env.BOT_MAX_REPLIES_PER_USER_PER_10_MIN, 6),
  BOT_THANK_FOLLOW_ENABLED: booleanValue(process.env.BOT_THANK_FOLLOW_ENABLED, true),
  BOT_AUTO_FOLLOW_BACK_ENABLED: booleanValue(process.env.BOT_AUTO_FOLLOW_BACK_ENABLED, true),
  BOT_ALLOW_MODEL_REPLY: booleanValue(process.env.BOT_ALLOW_MODEL_REPLY, true),
  BOT_AUTO_TEMP_BAN_CRITICAL: booleanValue(process.env.BOT_AUTO_TEMP_BAN_CRITICAL, true),
  BOT_CAN_AUTO_ACCEPT_LOW_RISK_APPEALS: booleanValue(process.env.BOT_CAN_AUTO_ACCEPT_LOW_RISK_APPEALS, false),
  BOT_CAN_CREATE_REPORTS: booleanValue(process.env.BOT_CAN_CREATE_REPORTS, true),
  BOT_CAN_WARN: booleanValue(process.env.BOT_CAN_WARN, true),
  BOT_CAN_HIDE_CONTENT: booleanValue(process.env.BOT_CAN_HIDE_CONTENT, true),
  BOT_CAN_TEMP_MUTE: booleanValue(process.env.BOT_CAN_TEMP_MUTE, true),
  BOT_CAN_TEMP_RESTRICT: booleanValue(process.env.BOT_CAN_TEMP_RESTRICT, true),
  BOT_CAN_TEMP_BAN: booleanValue(process.env.BOT_CAN_TEMP_BAN, true),
  BOT_CAN_FULL_BAN: booleanValue(process.env.BOT_CAN_FULL_BAN, false),
  BOT_CAN_DELETE_USERS: booleanValue(process.env.BOT_CAN_DELETE_USERS, false),
  BOT_CAN_CLEAR_LOGS: booleanValue(process.env.BOT_CAN_CLEAR_LOGS, false),
  BOT_CAN_CHANGE_ADMIN: booleanValue(process.env.BOT_CAN_CHANGE_ADMIN, false),
  ALLOW_BOT_AUTO_ACTIONS: booleanValue(process.env.ALLOW_BOT_AUTO_ACTIONS, true),

  MUSIC_ENABLED: booleanValue(process.env.MUSIC_ENABLED, true),
  MUSIC_PROVIDER: process.env.MUSIC_PROVIDER || "itunes",
  MUSIC_ALLOW_EXPLICIT: booleanValue(process.env.MUSIC_ALLOW_EXPLICIT, false),
  MUSIC_SEARCH_LIMIT: numberValue(process.env.MUSIC_SEARCH_LIMIT, 20),
  MUSIC_CACHE_TTL_MS: numberValue(process.env.MUSIC_CACHE_TTL_MS, 5 * 60 * 1000),
  JAMENDO_CLIENT_ID: process.env.JAMENDO_CLIENT_ID || "",

  ALGORITHM_ENABLED: booleanValue(process.env.ALGORITHM_ENABLED, true),
  FEED_CACHE_SECONDS: numberValue(process.env.FEED_CACHE_SECONDS, 60),
  TRENDING_CACHE_SECONDS: numberValue(process.env.TRENDING_CACHE_SECONDS, 120),
  MAX_CANDIDATE_POSTS: numberValue(process.env.MAX_CANDIDATE_POSTS, 500),
  DEFAULT_FEED_LIMIT: numberValue(process.env.DEFAULT_FEED_LIMIT, 20),
  EXPLORATION_PERCENT: numberValue(process.env.EXPLORATION_PERCENT, 10),
  FOLLOWING_PERCENT: numberValue(process.env.FOLLOWING_PERCENT, 35),
  LANGUAGE_PERCENT: numberValue(process.env.LANGUAGE_PERCENT, 25),
  TRENDING_PERCENT: numberValue(process.env.TRENDING_PERCENT, 10),
  NEW_USER_PERCENT: numberValue(process.env.NEW_USER_PERCENT, 10),
  STAFF_PERCENT: numberValue(process.env.STAFF_PERCENT, 5),

  SOCKET_IO_ENABLED: booleanValue(process.env.SOCKET_IO_ENABLED, true),
  CALL_SIGNALING_ENABLED: booleanValue(process.env.CALL_SIGNALING_ENABLED, true),
  STUN_URLS: listValue(process.env.STUN_URLS || "stun:stun.l.google.com:19302"),
  TURN_ENABLED: booleanValue(process.env.TURN_ENABLED, false),
  TURN_URL: process.env.TURN_URL || "",
  TURN_USERNAME: process.env.TURN_USERNAME || "",
  TURN_PASSWORD: process.env.TURN_PASSWORD || "",

  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_HTTP: booleanValue(process.env.LOG_HTTP, true),
  LOG_SOCKET: booleanValue(process.env.LOG_SOCKET, true),

  WORKER_CPU_FRACTION: numberValue(process.env.WORKER_CPU_FRACTION, 0.5),
  WORKER_MIN_PROCESSES: numberValue(process.env.WORKER_MIN_PROCESSES, 1),
  WORKER_MAX_PROCESSES: process.env.WORKER_MAX_PROCESSES || "auto",
  WORKER_QUEUES_ENABLED: booleanValue(process.env.WORKER_QUEUES_ENABLED, true),
};

export function isProduction() {
  return env.NODE_ENV === "production";
}

function isLocalHttpUrl(value = "") {
  return /^http:\/\/(localhost|127\.0\.0\.1|\[?::1\]?)(:\d+)?/i.test(String(value));
}

function isLocalHost(value = "") {
  return /^(localhost|127\.0\.0\.1|::1)$/i.test(String(value));
}

export function validateEnv() {
  const warnings = [];
  const productionLocalHttp =
    isProduction() &&
    !env.LOCAL_DEV &&
    !env.COOKIE_SECURE &&
    (isLocalHost(env.HOST) || isLocalHttpUrl(env.API_BASE_URL) || isLocalHttpUrl(env.CLIENT_URL));

  if (isProduction()) {
    if (!env.JWT_SECRET || env.JWT_SECRET === "local-dev-secret" || env.JWT_SECRET === "change-this-in-production") {
      throw new Error("JWT_SECRET must be set to a strong value in production.");
    }

    if (env.DB_DRIVER !== "mongo") {
      throw new Error("DB_DRIVER=mongo is required in production.");
    }

    if (!env.MONGO_URI) {
      throw new Error("MONGO_URI is required when DB_DRIVER=mongo in production.");
    }

    if (!env.COOKIE_SECURE && !productionLocalHttp) {
      throw new Error("COOKIE_SECURE=true is required in production.");
    }

    if (env.REDIS_REQUIRED && (!env.REDIS_ENABLED || !env.REDIS_URL)) {
      throw new Error("REDIS_ENABLED=true and REDIS_URL are required when REDIS_REQUIRED=true in production.");
    }

    if (env.SIGHTENGINE_ENABLED && (!env.SIGHTENGINE_API_USER || !env.SIGHTENGINE_API_SECRET)) {
      throw new Error("Sightengine is enabled but SIGHTENGINE_API_USER or SIGHTENGINE_API_SECRET is missing.");
    }
  }

  if (productionLocalHttp) {
    warnings.push("Production-style local HTTP detected; allowing COOKIE_SECURE=false only for localhost/127.0.0.1.");
  }
  if (env.REDIS_ENABLED && !env.REDIS_URL) warnings.push("REDIS_ENABLED=true but REDIS_URL is missing; using memory fallback.");
  if (env.REDIS_REQUIRED && !env.REDIS_ENABLED) warnings.push("REDIS_REQUIRED=true but REDIS_ENABLED=false.");
  if (env.SIGHTENGINE_ENABLED && (!env.SIGHTENGINE_API_USER || !env.SIGHTENGINE_API_SECRET)) {
    warnings.push("SIGHTENGINE_ENABLED=true but credentials are missing; moderation falls back locally.");
  }
  if (env.EMAIL_ENABLED && !process.env.SMTP_HOST) warnings.push("EMAIL_ENABLED=true but SMTP_HOST is missing; email may fall back locally.");
  if (env.TURN_ENABLED && !env.TURN_URL) warnings.push("TURN_ENABLED=true but TURN_URL is missing.");

  return warnings;
}

export function configuredCorsOrigins() {
  return env.CORS_ORIGINS;
}
