import { getDatabaseStatus } from "../config/database.js";
import { env } from "../config/env.js";
import { getRedisStatus } from "../config/redis.js";
import { getUploadHealth } from "../config/storage.js";
import { getWorkerStatus } from "../config/workers.js";
import { getSightengineStatus } from "../bots/services/sightengineService.js";
import { getOllamaHealthCache, listOllamaModels } from "../bots/services/ollamaClient.js";
import { getBotQueueStatus } from "../bots/botQueue.js";
import { getSmtpStatus } from "../lib/smtpMailer.js";

const startedAt = Date.now();

export function root(req, res) {
  res.status(200).json({
    name: "Better Media API",
    status: "ok",
    localDev: env.LOCAL_DEV,
    docs: "/api/version",
  });
}

export function health(req, res) {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: new Date(startedAt).toISOString(),
  });
}

export function version(req, res) {
  res.status(200).json({
    name: "better-media-backend",
    version: process.env.npm_package_version || "1.0.0",
    node: process.version,
    env: env.NODE_ENV,
    localDev: env.LOCAL_DEV,
    calls: {
      stunUrls: env.STUN_URLS,
      turnEnabled: env.TURN_ENABLED,
    },
  });
}

export async function ready(req, res) {
  const database = getDatabaseStatus();
  const redis = getRedisStatus();
  const sightengine = getSightengineStatus();
  const ollamaHealth = getOllamaHealthCache();
  const ollamaModels = env.OLLAMA_ENABLED && ollamaHealth.length === 0 ? await listOllamaModels() : null;
  const uploads = await getUploadHealth();
  const smtp = getSmtpStatus();
  const ok = Boolean(database.connected && (!redis.required || redis.connected) && uploads.healthy);
  res.status(ok ? 200 : 503).json({
    ok,
    ready: ok,
    mode: env.NODE_ENV,
    localDev: env.LOCAL_DEV,
    database,
    redis,
    sightengine,
    ollama: {
      enabled: env.OLLAMA_ENABLED,
      healthy: !env.OLLAMA_ENABLED || ollamaHealth.some((item) => item.ok) || Boolean(ollamaModels?.ok),
      models: ollamaHealth.length ? ollamaHealth : ollamaModels?.models || [],
      installed: ollamaModels?.installed || [],
    },
    storage: uploads,
    uploads,
    smtp,
    turn: {
      enabled: env.TURN_ENABLED,
      configured: Boolean(env.TURN_URL && env.TURN_USERNAME && env.TURN_PASSWORD),
    },
    providers: {
      detection: env.DETECTION_PROVIDER,
      decision: env.DECISION_PROVIDER,
      appealReviewer: env.APPEAL_REVIEWER,
    },
    queues: {
      bot: getBotQueueStatus(),
      workers: getWorkerStatus(),
    },
  });
}
