import { getBotEnvConfig } from "./botConfig.js";

const queue = [];
let running = 0;
let started = false;

async function runNext() {
  const config = getBotEnvConfig();
  if (running >= Math.max(1, config.queue.concurrency)) return;
  const item = queue.shift();
  if (!item) return;

  running += 1;
  try {
    await item.task();
  } catch (error) {
    console.error("[MEDIA BOT] Queue task failed:", error.message);
  } finally {
    running -= 1;
    setImmediate(runNext);
  }
}

export function enqueueBotTask(task, { priority = "normal" } = {}) {
  const config = getBotEnvConfig();
  if (!config.enabled) return false;
  if (queue.length >= config.queue.maxPending) {
    if (priority === "low" && config.queue.dropLowPriorityWhenFull) return false;
    queue.shift();
  }
  queue.push({ task, priority, createdAt: Date.now() });
  setImmediate(runNext);
  return true;
}

export function startBotQueue() {
  started = true;
  setImmediate(runNext);
}

export function getBotQueueStatus() {
  return {
    started,
    pending: queue.length,
    running,
  };
}
