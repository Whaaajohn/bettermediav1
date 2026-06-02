import { recordBotModelCacheFor } from "../lib/localStore.js";
import { getBotEnvConfig } from "./botConfig.js";

const pipelines = new Map();

export async function loadHuggingFacePipeline(task, model) {
  const config = getBotEnvConfig();
  if (!config.enabled || !config.localAIEnabled || !model) return null;
  const key = `${task}:${model}`;
  if (pipelines.has(key)) return pipelines.get(key);

  try {
    const { pipeline, env: transformerEnv } = await import("@xenova/transformers");
    transformerEnv.allowRemoteModels = !config.models.localFilesOnly;
    transformerEnv.localModelPath = config.models.cacheDir;
    transformerEnv.cacheDir = config.models.cacheDir;
    const instance = await pipeline(task, model, {
      local_files_only: config.models.localFilesOnly,
    });
    pipelines.set(key, instance);
    await recordBotModelCacheFor({ provider: "huggingface", model, status: "ready" });
    return instance;
  } catch (error) {
    await recordBotModelCacheFor({
      provider: "huggingface",
      model,
      status: "fallback",
      reason: error.message,
    });
    return null;
  }
}

export function getLoadedModelCount() {
  return pipelines.size;
}
