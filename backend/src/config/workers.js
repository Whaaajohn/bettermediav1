import os from "os";

import { env } from "./env.js";

function workerMaxFromEnv(cpuCount) {
  if (String(env.WORKER_MAX_PROCESSES).toLowerCase() === "auto") return null;
  const parsed = Number(env.WORKER_MAX_PROCESSES);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

export function getWorkerStatus() {
  const cpuCount = os.cpus().length || 1;
  const fraction = Math.max(0.05, Math.min(1, Number(env.WORKER_CPU_FRACTION || 0.5)));
  const calculated = Math.max(
    Number(env.WORKER_MIN_PROCESSES || 1),
    Math.floor(cpuCount * fraction)
  );
  const configuredMax = workerMaxFromEnv(cpuCount);
  const maxWorkers = configuredMax ? Math.min(configuredMax, calculated) : calculated;
  const localJsonMode = env.DB_DRIVER !== "mongo";

  return {
    queuesEnabled: env.WORKER_QUEUES_ENABLED,
    cpuCount,
    cpuFraction: fraction,
    minProcesses: env.WORKER_MIN_PROCESSES,
    maxProcesses: env.WORKER_MAX_PROCESSES,
    targetWorkers: Math.max(1, maxWorkers),
    activeWorkers: 0,
    idleSafe: true,
    queueBackend: env.REDIS_ENABLED && env.REDIS_QUEUES ? "redis-or-fallback" : "memory",
    localJsonSingleWriter: localJsonMode,
    warning: localJsonMode
      ? "Local JSON mode keeps writes in the main process. Workers should send write requests back to the main writer."
      : "",
  };
}
