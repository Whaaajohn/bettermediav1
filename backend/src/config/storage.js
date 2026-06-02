import fs from "fs/promises";
import path from "path";

import { env } from "./env.js";
import { getDatabaseStatus } from "./database.js";

export function getUploadDirectory() {
  return path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);
}

export function getStorageStatus() {
  const uploadDir = getUploadDirectory();
  return {
    driver: env.UPLOAD_DRIVER,
    local: env.UPLOAD_DRIVER === "local",
    mongo: env.UPLOAD_DRIVER === "mongo",
    uploadDir,
    path: uploadDir,
    publicUrl: env.PUBLIC_UPLOAD_URL,
    maxUploadMb: env.MAX_UPLOAD_MB,
    s3Configured: Boolean(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY),
    r2Configured: Boolean(env.R2_BUCKET && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY),
  };
}

export async function ensureUploadDirectory() {
  if (env.UPLOAD_DRIVER === "mongo") return;
  await fs.mkdir(getUploadDirectory(), { recursive: true });
}

export async function getUploadHealth() {
  const status = getStorageStatus();
  if (env.UPLOAD_DRIVER === "mongo") {
    const database = getDatabaseStatus();
    return {
      ...status,
      writable: Boolean(database.driver === "mongo" && database.connected),
      healthy: Boolean(database.driver === "mongo" && database.connected),
      gridFsBucket: "uploads",
    };
  }

  if (env.UPLOAD_DRIVER !== "local") {
    return {
      ...status,
      writable: Boolean(status.s3Configured || status.r2Configured),
      healthy: Boolean(status.s3Configured || status.r2Configured),
    };
  }

  try {
    await ensureUploadDirectory();
    const testPath = path.join(status.uploadDir, `.write-test-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await fs.writeFile(testPath, "ok");
    await fs.unlink(testPath);
    return {
      ...status,
      writable: true,
      healthy: true,
    };
  } catch (error) {
    return {
      ...status,
      writable: false,
      healthy: false,
      error: error.message,
    };
  }
}
