import fs from "fs/promises";
import path from "path";

import { connectDatabase, closeDatabase } from "../config/database.js";
import { getUploadDirectory } from "../config/storage.js";
import { getLocalDbPath, getMediaDirectory } from "../lib/localStore.js";
import { saveLocalFileToMongoUpload } from "../services/storage.service.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractFilename(value = "") {
  if (typeof value !== "string") return "";
  const match = value.match(/\/(?:uploads|media)\/([^?#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

function collectMediaRefs(data = {}) {
  const refs = new Map();

  function add(value, sourceType, sourceId) {
    const filename = value?.filename || extractFilename(value?.url || value?.publicUrl || value);
    if (!filename) return;
    refs.set(filename, {
      filename,
      mimeType: value?.mimeType || "application/octet-stream",
      sourceType,
      sourceId,
    });
  }

  for (const user of asArray(data.users)) add(user.profilePic, "profile_picture", user._id);
  for (const post of asArray(data.posts)) {
    add(post.media, "post", post._id);
    add(post.thumbnail, "post_thumbnail", post._id);
    for (const item of asArray(post.mediaItems)) add(item, "post_media_item", post._id);
  }
  for (const message of asArray(data.messages)) {
    add(message.media || message.file || message.attachment, "message", message._id);
    add(message.voice || message.voiceMessage, "voice_message", message._id);
  }

  return [...refs.values()];
}

async function findLocalFile(filename) {
  const candidates = [
    path.join(getUploadDirectory(), filename),
    path.join(getMediaDirectory(), filename),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

const raw = await fs.readFile(getLocalDbPath(), "utf8");
const data = JSON.parse(raw || "{}");
const refs = collectMediaRefs(data);

await connectDatabase();

const summary = {
  scanned: refs.length,
  exported: 0,
  missing: 0,
  errors: [],
};

for (const ref of refs) {
  const filePath = await findLocalFile(ref.filename);
  if (!filePath) {
    summary.missing += 1;
    continue;
  }
  try {
    await saveLocalFileToMongoUpload({
      filePath,
      filename: ref.filename,
      mimeType: ref.mimeType,
      metadata: {
        sourceType: ref.sourceType,
        sourceId: ref.sourceId,
        migratedFrom: filePath,
      },
    });
    summary.exported += 1;
  } catch (error) {
    summary.errors.push({ filename: ref.filename, error: error.message });
  }
}

await closeDatabase();
console.log(JSON.stringify(summary, null, 2));
