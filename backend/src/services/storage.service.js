import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";

import { getDatabaseStatus } from "../config/database.js";
import { env } from "../config/env.js";
import { ensureUploadDirectory, getUploadDirectory } from "../config/storage.js";

const extensionFromMime = (mimeType = "") => {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/webm": "webm",
    "audio/mpeg": "mp3",
    "text/plain": "txt",
    "application/pdf": "pdf",
  };
  return map[mimeType] || "bin";
};

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/webm",
  "audio/mpeg",
  "text/plain",
  "application/pdf",
]);

function shouldUseMongoUploads() {
  return env.UPLOAD_DRIVER === "mongo" || (env.DB_DRIVER === "mongo" && env.UPLOAD_DRIVER !== "local");
}

async function getMongoUploadBucket() {
  if (getDatabaseStatus().driver !== "mongo" || !getDatabaseStatus().connected) {
    const error = new Error("MongoDB upload storage is not connected.");
    error.status = 503;
    throw error;
  }
  const mongoose = await import("mongoose");
  const { GridFSBucket } = await import("mongodb");
  return new GridFSBucket(mongoose.default.connection.db, { bucketName: "uploads" });
}

async function saveMongoUpload({ buffer, filename, mimeType, metadata = {} }) {
  const bucket = await getMongoUploadBucket();

  await new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(filename, {
      contentType: mimeType,
      metadata: {
        ...metadata,
        originalFilename: metadata.originalFilename || filename,
        uploadedAt: new Date().toISOString(),
      },
    });
    Readable.from(buffer).pipe(stream).on("error", reject).on("finish", resolve);
  });
}

export async function saveUploadDataUrl({ dataUrl, filename = "upload" }) {
  const match = dataUrl?.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    const error = new Error("Upload must be a valid data URL.");
    error.status = 400;
    throw error;
  }

  const [, mimeType, base64Data] = match;
  if (!allowedMimeTypes.has(mimeType)) {
    const error = new Error("This file type is not allowed for local uploads.");
    error.status = 400;
    throw error;
  }

  const sizeBytes = Buffer.byteLength(base64Data, "base64");
  const maxBytes = Math.max(1, env.MAX_UPLOAD_MB) * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    const error = new Error(`Upload is too large. Maximum size is ${env.MAX_UPLOAD_MB} MB.`);
    error.status = 413;
    throw error;
  }

  const safeName = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .slice(0, 48) || "upload";
  const extension = extensionFromMime(mimeType);
  const storedName = `${Date.now()}-${crypto.randomUUID()}-${safeName}.${extension}`;
  const buffer = Buffer.from(base64Data, "base64");

  if (shouldUseMongoUploads()) {
    await saveMongoUpload({
      buffer,
      filename: storedName,
      mimeType,
      metadata: { originalFilename: filename, driver: "mongo-gridfs" },
    });
  } else if (env.UPLOAD_DRIVER === "local") {
    await ensureUploadDirectory();
    await fs.writeFile(path.join(getUploadDirectory(), storedName), buffer);
  } else {
    const error = new Error("This upload driver is not configured.");
    error.status = 501;
    throw error;
  }

  return {
    filename: storedName,
    mimeType,
    size: sizeBytes,
    url: `/uploads/${storedName}`,
    publicUrl: `${env.PUBLIC_UPLOAD_URL.replace(/\/$/, "")}/${storedName}`,
    driver: shouldUseMongoUploads() ? "mongo-gridfs" : "local",
  };
}

export async function saveLocalFileToMongoUpload({ filePath, filename, mimeType = "application/octet-stream", metadata = {} }) {
  if (!shouldUseMongoUploads()) return null;
  const buffer = await fs.readFile(filePath);
  await saveMongoUpload({ buffer, filename, mimeType, metadata });
  return {
    filename,
    mimeType,
    size: buffer.length,
    url: `/uploads/${filename}`,
    publicUrl: `${env.PUBLIC_UPLOAD_URL.replace(/\/$/, "")}/${filename}`,
    driver: "mongo-gridfs",
  };
}

export async function serveUploadByFilename(req, res, next) {
  if (!shouldUseMongoUploads()) return next();
  try {
    const bucket = await getMongoUploadBucket();
    const filename = req.params.filename;
    const files = await bucket.find({ filename }).limit(1).toArray();
    const file = files[0];
    if (!file) return next();

    if (file.contentType) res.setHeader("Content-Type", file.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    bucket.openDownloadStreamByName(filename).on("error", next).pipe(res);
  } catch (error) {
    next(error);
  }
}
