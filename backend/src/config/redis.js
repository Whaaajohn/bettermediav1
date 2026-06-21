import https from "node:https";
import { URL } from "node:url";

import { env, isProduction } from "./env.js";

const memoryStore = new Map();
let redisClient = null;
let redisStatus = {
  enabled: env.REDIS_ENABLED,
  required: env.REDIS_REQUIRED,
  connected: false,
  fallback: true,
  message: "Using in-memory Redis fallback",
  provider: "memory",
  features: {
    rateLimits: env.REDIS_RATE_LIMITS,
    queues: env.REDIS_QUEUES,
    socketAdapter: env.USE_REDIS_SOCKET_ADAPTER || env.REDIS_SOCKET_ADAPTER,
  },
};

function hasUpstashRestConfig() {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

async function runUpstashRestCommand(command, ...args) {
  const timeoutMs = Math.min(Math.max(env.UPSTASH_REDIS_TIMEOUT_MS, 1000), 10000);
  const endpoint = new URL(env.UPSTASH_REDIS_REST_URL.replace(/\/$/, ""));
  const body = JSON.stringify([command, ...args]);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        protocol: endpoint.protocol,
        hostname: endpoint.hostname,
        port: endpoint.port || 443,
        path: `${endpoint.pathname}${endpoint.search}`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          let payload = {};
          try {
            payload = raw ? JSON.parse(raw) : {};
          } catch {
            return reject(new Error(`Upstash REST returned invalid JSON (${response.statusCode})`));
          }

          if (response.statusCode < 200 || response.statusCode >= 300 || payload.error) {
            return reject(new Error(payload.error || `Upstash REST request failed (${response.statusCode})`));
          }

          return resolve(payload.result);
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("Upstash REST request timed out."));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function createUpstashRestClient() {
  return {
    provider: "upstash-rest",
    isOpen: true,
    async incr(key) {
      return Number(await runUpstashRestCommand("INCR", key));
    },
    async pExpire(key, windowMs) {
      return runUpstashRestCommand("PEXPIRE", key, windowMs);
    },
    async pTTL(key) {
      return Number(await runUpstashRestCommand("PTTL", key));
    },
    async ping() {
      return runUpstashRestCommand("PING");
    },
  };
}

async function connectUpstashRest() {
  redisClient = createUpstashRestClient();
  await redisClient.ping();
  redisStatus = {
    enabled: true,
    required: env.REDIS_REQUIRED,
    connected: true,
    fallback: false,
    provider: "upstash-rest",
    message: "Upstash Redis REST connected",
    features: {
      ...redisStatus.features,
      socketAdapter: false,
    },
  };

  return redisStatus;
}

export async function connectRedis() {
  if (!env.REDIS_ENABLED) return redisStatus;

  if (!env.REDIS_URL) {
    if (hasUpstashRestConfig()) {
      try {
        return await connectUpstashRest();
      } catch (error) {
        if (env.REDIS_REQUIRED && isProduction()) throw error;
        redisClient = null;
        redisStatus = {
          enabled: true,
          required: env.REDIS_REQUIRED,
          connected: false,
          fallback: true,
          provider: "memory",
          message: `Upstash Redis REST unavailable: ${error.message}`,
          features: redisStatus.features,
        };
        return redisStatus;
      }
    }

    if (env.REDIS_REQUIRED && isProduction()) {
      throw new Error("REDIS_URL or UPSTASH_REDIS_REST_URL/TOKEN is required when REDIS_REQUIRED=true in production.");
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
        provider: "memory",
        message: `Redis error, memory fallback active: ${error.message}`,
      };
    });
    await redisClient.connect();
    redisStatus = {
      enabled: true,
      required: env.REDIS_REQUIRED,
      connected: true,
      fallback: false,
      provider: "redis",
      message: "Redis connected",
      features: redisStatus.features,
    };
  } catch (error) {
    if (hasUpstashRestConfig()) {
      try {
        return await connectUpstashRest();
      } catch (restError) {
        if (env.REDIS_REQUIRED && isProduction()) throw restError;
        redisClient = null;
        redisStatus = {
          enabled: true,
          required: env.REDIS_REQUIRED,
          connected: false,
          fallback: true,
          provider: "memory",
          message: `Redis and Upstash REST unavailable: ${error.message}; ${restError.message}`,
          features: redisStatus.features,
        };
        return redisStatus;
      }
    }

    if (env.REDIS_REQUIRED && isProduction()) throw error;
    if (isProduction() && env.REDIS_ENABLED) {
      redisStatus = {
        enabled: true,
        required: env.REDIS_REQUIRED,
        connected: false,
        fallback: true,
        provider: "memory",
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
  if (redisClient?.isOpen && typeof redisClient.quit === "function") {
    await redisClient.quit();
  }
}
