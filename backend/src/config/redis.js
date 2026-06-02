import { env, isProduction } from "./env.js";

const memoryStore = new Map();
let redisClient = null;
let redisStatus = {
  enabled: env.REDIS_ENABLED,
  required: env.REDIS_REQUIRED,
  connected: false,
  fallback: true,
  message: "Using in-memory Redis fallback",
  features: {
    rateLimits: env.REDIS_RATE_LIMITS,
    queues: env.REDIS_QUEUES,
    socketAdapter: env.USE_REDIS_SOCKET_ADAPTER || env.REDIS_SOCKET_ADAPTER,
  },
};

export async function connectRedis() {
  if (!env.REDIS_ENABLED) return redisStatus;

  if (!env.REDIS_URL) {
    if (env.REDIS_REQUIRED && isProduction()) {
      throw new Error("REDIS_URL is required when REDIS_REQUIRED=true in production.");
    }
    if (isProduction()) {
      redisStatus.message = "Redis enabled without REDIS_URL; memory fallback active.";
    }
    return redisStatus;
  }

  try {
    const redis = await import("redis");
    redisClient = redis.createClient({ url: env.REDIS_URL });
    redisClient.on("error", (error) => {
      redisStatus = {
        enabled: true,
        connected: false,
        fallback: true,
        message: `Redis error, memory fallback active: ${error.message}`,
      };
    });
    await redisClient.connect();
    redisStatus = {
      enabled: true,
      required: env.REDIS_REQUIRED,
      connected: true,
      fallback: false,
      message: "Redis connected",
      features: redisStatus.features,
    };
  } catch (error) {
    if (env.REDIS_REQUIRED && isProduction()) throw error;
    if (isProduction() && env.REDIS_ENABLED) {
      redisStatus = {
        enabled: true,
        required: env.REDIS_REQUIRED,
        connected: false,
        fallback: true,
        message: `Redis unavailable: ${error.message}`,
        features: redisStatus.features,
      };
    }
  }

  return redisStatus;
}

export function getRedisStatus() {
  return redisStatus;
}

export function getMemoryStore() {
  return memoryStore;
}

export function getRedisClient() {
  return redisClient;
}

export async function closeRedis() {
  if (redisClient?.isOpen) await redisClient.quit();
}
