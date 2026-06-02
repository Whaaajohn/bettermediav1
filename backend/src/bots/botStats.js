import { getBotHealthFor } from "../lib/localStore.js";
import { getBotQueueStatus } from "./botQueue.js";
import { getLoadedModelCount } from "./botModelLoader.js";

export async function getBotRuntimeStats(userId = null) {
  const health = await getBotHealthFor(userId);
  return {
    ...health,
    queue: getBotQueueStatus(),
    loadedModels: getLoadedModelCount(),
  };
}
