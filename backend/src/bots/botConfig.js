import { env } from "../config/env.js";

export function getBotEnvConfig() {
  return {
    enabled: env.BOT_ENGINE_ENABLED,
    localAIEnabled: env.BOT_LOCAL_AI_ENABLED,
    scans: {
      post: env.BOT_SCAN_POSTS,
      comment: env.BOT_SCAN_COMMENTS,
      message: env.BOT_SCAN_MESSAGES,
      image: env.BOT_SCAN_IMAGES,
      report: env.BOT_SCAN_REPORTS,
      appeal: env.BOT_SCAN_APPEALS,
    },
    models: {
      text: env.BOT_TEXT_MODEL,
      multilingualText: env.BOT_MULTILINGUAL_TEXT_MODEL,
      reply: env.BOT_REPLY_MODEL,
      image: env.BOT_IMAGE_MODEL,
      localFilesOnly: env.BOT_LOCAL_FILES_ONLY,
      cacheDir: env.BOT_MODEL_CACHE_DIR,
    },
    queue: {
      concurrency: env.BOT_QUEUE_CONCURRENCY,
      maxPending: env.BOT_QUEUE_MAX_PENDING,
      dropLowPriorityWhenFull: env.BOT_QUEUE_DROP_LOW_PRIORITY_WHEN_FULL,
    },
    limits: {
      textScanMaxLength: env.BOT_TEXT_SCAN_MAX_LENGTH,
      imageScanMaxMb: env.BOT_IMAGE_SCAN_MAX_MB,
      actionCooldownMs: env.BOT_ACTION_COOLDOWN_MS,
      maxActionsPerUserPerHour: env.BOT_MAX_ACTIONS_PER_USER_PER_HOUR,
      maxWarningsBeforeMute: env.BOT_MAX_WARNINGS_BEFORE_MUTE,
      maxMutesBeforeAdminReview: env.BOT_MAX_MUTES_BEFORE_ADMIN_REVIEW,
      maxMuteMinutes: env.BOT_MAX_MUTE_MINUTES,
      spamMuteMinutes: env.BOT_SPAM_MUTE_MINUTES,
      maxTempBanMinutes: env.BOT_MAX_TEMP_BAN_MINUTES,
      criticalTempBanMinutes: env.BOT_CRITICAL_TEMP_BAN_MINUTES,
    },
    actions: {
      low: env.BOT_LOW_CONFIDENCE_ACTION,
      medium: env.BOT_MEDIUM_CONFIDENCE_ACTION,
      high: env.BOT_HIGH_CONFIDENCE_ACTION,
      critical: env.BOT_CRITICAL_CONFIDENCE_ACTION,
    },
  };
}

export function isBotScanEnabled(type) {
  const config = getBotEnvConfig();
  if (!config.enabled) return false;
  return config.scans[type] !== false;
}
