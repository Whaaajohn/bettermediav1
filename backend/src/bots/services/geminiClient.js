import { env } from "../../config/env.js";

const healthCache = new Map();

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

function imagePart(value = "") {
  const match = String(value).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

function responseText(payload = {}) {
  return (payload.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
}

export async function runGeminiGenerate({
  task = "chat",
  model = "",
  prompt = "",
  systemInstruction = "",
  images = null,
  responseMimeType = "text/plain",
  temperature = env.GEMINI_TEMPERATURE,
  maxOutputTokens = env.GEMINI_MAX_OUTPUT_TOKENS,
  timeoutMs = env.GEMINI_TIMEOUT_MS,
} = {}) {
  const modelUsed = model || (task === "vision" ? env.GEMINI_VISION_MODEL : env.GEMINI_MODEL);
  if (!env.GEMINI_ENABLED || !env.GEMINI_API_KEY || typeof fetch !== "function") {
    return { ok: false, modelUsed, reason: "Gemini disabled or API key missing" };
  }

  const parts = [{ text: String(prompt || "").slice(0, env.GEMINI_MAX_CONTEXT_CHARS) }];
  for (const image of Array.isArray(images) ? images : []) {
    const part = imagePart(image);
    if (part) parts.push(part);
  }

  const { controller, timer } = timeoutSignal(timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(
      `${env.GEMINI_API_BASE_URL.replace(/\/$/, "")}/models/${encodeURIComponent(modelUsed)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: systemInstruction
            ? { parts: [{ text: String(systemInstruction).slice(0, 8000) }] }
            : undefined,
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature,
            maxOutputTokens,
            responseMimeType,
          },
        }),
      }
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Gemini ${modelUsed} failed: ${response.status} ${details.slice(0, 180)}`);
    }

    const raw = await response.json();
    const elapsedMs = Date.now() - startedAt;
    const text = responseText(raw);
    if (!text) throw new Error("Gemini returned an empty response");

    healthCache.set(modelUsed, {
      ok: true,
      model: modelUsed,
      task,
      elapsedMs,
      checkedAt: new Date().toISOString(),
    });

    return { ok: true, modelUsed, elapsedMs, response: text, raw };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    healthCache.set(modelUsed, {
      ok: false,
      model: modelUsed,
      task,
      elapsedMs,
      checkedAt: new Date().toISOString(),
      error: error.message,
    });
    return { ok: false, modelUsed, elapsedMs, reason: error.message };
  } finally {
    clearTimeout(timer);
  }
}

export function getGeminiStatus() {
  return {
    enabled: env.GEMINI_ENABLED,
    configured: Boolean(env.GEMINI_ENABLED && env.GEMINI_API_KEY),
    model: env.GEMINI_MODEL,
    visionModel: env.GEMINI_VISION_MODEL,
    health: [...healthCache.values()],
  };
}
