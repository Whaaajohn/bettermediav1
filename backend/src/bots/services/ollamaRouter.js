import { env } from "../../config/env.js";

export const OLLAMA_ROUTES = {
  fastChat: () => env.OLLAMA_FAST_CHAT_MODEL || env.OLLAMA_TEXT_MODEL || env.OLLAMA_MODEL,
  textModeration: () => env.OLLAMA_TEXT_MODEL || env.OLLAMA_MODEL,
  appeal: () => env.OLLAMA_APPEAL_MODEL || env.OLLAMA_BACKUP_MODEL || env.OLLAMA_MODEL,
  vision: () => env.OLLAMA_VISION_MODEL || env.OLLAMA_BACKUP_MODEL || env.OLLAMA_MODEL,
  strongVision: () => env.OLLAMA_STRONG_VISION_MODEL || env.OLLAMA_VISION_MODEL || env.OLLAMA_BACKUP_MODEL || env.OLLAMA_MODEL,
  backup: () => env.OLLAMA_BACKUP_MODEL || env.OLLAMA_MODEL,
};

export function modelForTask(task = "textModeration") {
  const resolver = OLLAMA_ROUTES[task] || OLLAMA_ROUTES.textModeration;
  return resolver();
}

export function modelRoutingSummary() {
  return {
    fastChat: modelForTask("fastChat"),
    textModeration: modelForTask("textModeration"),
    appeal: modelForTask("appeal"),
    vision: modelForTask("vision"),
    strongVision: modelForTask("strongVision"),
    backup: modelForTask("backup"),
  };
}

