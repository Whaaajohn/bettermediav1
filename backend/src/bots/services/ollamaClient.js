import { env } from "../../config/env.js";
import { modelForTask, modelRoutingSummary } from "./ollamaRouter.js";

const healthCache = new Map();

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

export async function listOllamaModels() {
  if (!env.OLLAMA_ENABLED || typeof fetch !== "function") {
    return { ok: false, models: [], routing: modelRoutingSummary(), reason: "Ollama disabled" };
  }

  const { controller, timer } = timeoutSignal(5000);
  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/tags`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Ollama tags failed: ${response.status}`);
    const payload = await response.json();
    const models = Array.isArray(payload.models) ? payload.models : [];
    return {
      ok: true,
      models,
      installed: models.map((model) => model.name || model.model).filter(Boolean),
      routing: modelRoutingSummary(),
    };
  } catch (error) {
    return { ok: false, models: [], routing: modelRoutingSummary(), reason: error.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function runOllamaGenerate({
  task = "textModeration",
  model = "",
  prompt = "",
  images = null,
  format = undefined,
  temperature = 0.2,
  numPredict = 220,
  timeoutMs = env.OLLAMA_TIMEOUT_MS,
} = {}) {
  if (!env.OLLAMA_ENABLED || typeof fetch !== "function") {
    return { ok: false, reason: "Ollama disabled", modelUsed: model || modelForTask(task) };
  }

  const modelUsed = model || modelForTask(task);
  const startedAt = Date.now();
  const { controller, timer } = timeoutSignal(timeoutMs);

  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelUsed,
        prompt: String(prompt || "").slice(0, env.OLLAMA_MAX_CONTEXT_CHARS || 12000),
        stream: false,
        format,
        images: Array.isArray(images) && images.length ? images : undefined,
        options: {
          temperature,
          num_predict: numPredict,
        },
      }),
    });

    if (!response.ok) throw new Error(`Ollama ${modelUsed} failed: ${response.status}`);
    const payload = await response.json();
    const elapsedMs = Date.now() - startedAt;
    healthCache.set(modelUsed, { ok: true, model: modelUsed, task, elapsedMs, checkedAt: new Date().toISOString() });
    return {
      ok: true,
      modelUsed,
      elapsedMs,
      response: String(payload?.response || "").trim(),
      raw: payload,
    };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    healthCache.set(modelUsed, { ok: false, model: modelUsed, task, elapsedMs, checkedAt: new Date().toISOString(), error: error.message });
    return { ok: false, modelUsed, elapsedMs, reason: error.message };
  } finally {
    clearTimeout(timer);
  }
}

export function getOllamaHealthCache() {
  return [...healthCache.values()];
}

