import "dotenv/config";
import fs from "fs/promises";
import path from "path";

import { env as appEnv } from "../config/env.js";

const cacheDir = path.resolve(process.cwd(), appEnv.HF_HOME || appEnv.BOT_MODEL_CACHE_DIR || "./data/models");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loadPipeline(task, model, sample, options = {}) {
  const { pipeline, env: transformerEnv } = await import("@xenova/transformers");
  transformerEnv.allowRemoteModels = true;
  transformerEnv.localModelPath = cacheDir;
  transformerEnv.cacheDir = cacheDir;

  console.log(`[MEDIA BOT] Downloading/caching ${task} model: ${model}`);
  const pipe = await pipeline(task, model, {
    cache_dir: cacheDir,
    local_files_only: false,
    ...options,
  });

  if (sample !== undefined) {
    await pipe(sample, task === "text-generation" ? { max_new_tokens: 16 } : undefined);
  }

  if (typeof pipe.dispose === "function") {
    await pipe.dispose();
  }
  console.log(`[MEDIA BOT] Ready: ${model}`);
}

async function main() {
  await ensureDir(cacheDir);

  const jobs = [
    {
      task: "text-classification",
      model: appEnv.BOT_TEXT_MODEL,
      sample: "Thanks for keeping Better Media safe.",
    },
    {
      task: "text-generation",
      model: appEnv.HF_LOCAL_MODEL || appEnv.BOT_REPLY_MODEL,
      sample: "Better Media local assistant:",
    },
  ].filter((job) => job.model);

  for (const job of jobs) {
    await loadPipeline(job.task, job.model, job.sample);
  }

  console.log(`[MEDIA BOT] Models cached at ${cacheDir}`);
  console.log("[MEDIA BOT] Set HF_LOCAL_FILES_ONLY=true after this if you want fully offline model loading.");
}

main().catch((error) => {
  console.error("[MEDIA BOT] Model download failed:", error.message);
  process.exit(1);
});
