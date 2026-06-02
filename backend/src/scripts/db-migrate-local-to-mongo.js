import fs from "fs/promises";
import path from "path";

import { closeDatabase, connectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { getUploadDirectory } from "../config/storage.js";
import { backupLocalStore, getLocalDbPath, getMediaDirectory } from "../lib/localStore.js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry") || args.has("--dry-run");

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function idFor(collection, item, index) {
  return String(item?._id || item?.id || item?.callId || item?.slug || `${collection}-${index}`);
}

function addDays(date, days) {
  const next = new Date(date || Date.now());
  next.setDate(next.getDate() + days);
  return next;
}

async function readLocalDb() {
  const dbPath = getLocalDbPath();
  const raw = await fs.readFile(dbPath, "utf8");
  const data = JSON.parse(raw);
  return { dbPath, data };
}

function flattenComments(posts = []) {
  const comments = [];

  function visit(comment, postId, parentId = null, rootId = null, depth = 0) {
    const clean = {
      ...comment,
      post: postId,
      parentComment: parentId,
      parentId: comment.parentId ?? parentId,
      rootId: comment.rootId || rootId || comment._id,
      depth: Number.isFinite(Number(comment.depth)) ? Number(comment.depth) : depth,
      replyCount: asArray(comment.replies).length,
    };
    delete clean.replies;
    comments.push(clean);

    for (const reply of asArray(comment.replies)) {
      visit(reply, postId, comment._id, clean.rootId, clean.depth + 1);
    }
  }

  for (const post of posts) {
    for (const comment of asArray(post.comments)) visit(comment, post._id);
  }

  return comments;
}

function normalizeCallLog(call = {}) {
  return {
    _id: call._id || call.callId,
    callId: call.callId || call._id,
    callerId: call.callerId,
    calleeId: call.calleeId,
    participants: asArray(call.participants).length
      ? call.participants
      : [call.callerId, call.calleeId].filter(Boolean),
    mode: call.mode || "video",
    status: call.status || "ended",
    startedAt: call.startedAt || call.createdAt,
    acceptedAt: call.acceptedAt,
    endedAt: call.endedAt || call.updatedAt,
    durationMs: call.durationMs || 0,
    endReason: call.reason || call.endReason || "",
    mediaState: call.mediaState || {},
    createdAt: call.createdAt,
    updatedAt: call.updatedAt,
  };
}

function normalizeSession(session = {}) {
  return {
    ...session,
    _id: session._id || session.id,
    userId: session.userId,
    tokenHash: session.tokenHash || session.refreshTokenHash || session.hash || "migrated-session-hash",
    deviceId: session.deviceId || session._id || session.id || "migrated-device",
    expiresAt: session.expiresAt || addDays(session.createdAt, 7),
  };
}

function normalizeLoginChallenge(challenge = {}) {
  return {
    ...challenge,
    _id: challenge._id || challenge.id,
    codeHash: challenge.codeHash || challenge.hash || "migrated-code-hash",
    expiresAt: challenge.expiresAt || addDays(challenge.createdAt, 1),
  };
}

function extractFilename(value = "") {
  if (typeof value !== "string") return "";
  const match = value.match(/\/(?:uploads|media)\/([^?#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

async function fileMissing(filename) {
  if (!filename) return false;
  const candidates = [
    path.join(getUploadDirectory(), filename),
    path.join(getMediaDirectory(), filename),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return false;
    } catch {
      // Try the next known local media directory.
    }
  }
  return true;
}

async function fileExistsInUploadDir(filename) {
  if (!filename) return false;
  try {
    await fs.access(path.join(getUploadDirectory(), filename));
    return true;
  } catch {
    return false;
  }
}

async function collectUploadMetadata(data) {
  const uploads = new Map();

  async function addUpload({ value, sourceType, sourceId, mimeType = "", size = 0 }) {
    const filename = value?.filename || extractFilename(value?.url || value?.publicUrl || value);
    if (!filename) return;

    const url = value?.url || `/uploads/${filename}`;
    uploads.set(`${sourceType}:${sourceId}:${filename}`, {
      _id: `${sourceType}-${sourceId}-${filename}`.replace(/[^a-z0-9_.:-]+/gi, "-").slice(0, 220),
      filename,
      url,
      publicUrl: value?.publicUrl || url,
      mimeType: value?.mimeType || mimeType,
      size: value?.size || size || 0,
      driver: value?.driver || "local",
      sourceType,
      sourceId,
      missingFile: await fileMissing(filename),
      legacyMediaFile: !(await fileExistsInUploadDir(filename)),
    });
  }

  for (const user of asArray(data.users)) {
    await addUpload({ value: user.profilePic, sourceType: "profile_picture", sourceId: user._id });
  }

  for (const post of asArray(data.posts)) {
    await addUpload({ value: post.media, sourceType: "post", sourceId: post._id });
    await addUpload({ value: post.thumbnail, sourceType: "post_thumbnail", sourceId: post._id });
    for (const item of asArray(post.mediaItems)) {
      await addUpload({ value: item, sourceType: "post_media_item", sourceId: post._id });
    }
  }

  for (const message of asArray(data.messages)) {
    await addUpload({ value: message.media || message.file || message.attachment, sourceType: "message", sourceId: message._id });
    await addUpload({ value: message.voice || message.voiceMessage, sourceType: "voice_message", sourceId: message._id });
  }

  return [...uploads.values()];
}

async function upsertMany(model, collection, items = [], summary) {
  const cleanItems = asArray(items).filter(Boolean);
  if (dryRun) {
    summary[collection] = { local: cleanItems.length, migrated: 0, dryRun: true };
    return;
  }

  let migrated = 0;
  let failed = 0;
  for (const [index, item] of cleanItems.entries()) {
    const _id = idFor(collection, item, index);
    try {
      await model.updateOne({ _id }, { $set: { ...item, _id } }, { upsert: true, runValidators: false });
      migrated += 1;
    } catch (error) {
      failed += 1;
      console.log(`[MONGO MIGRATE] ${collection}:${_id} skipped: ${error.message}`);
    }
  }

  summary[collection] = {
    local: cleanItems.length,
    migrated,
    failed,
    mongo: await model.countDocuments(),
  };
}

async function mirrorCollection(LocalMirrorRecord, collection, value, summary) {
  if (value === undefined) return;

  const items = Array.isArray(value)
    ? value.map((item, index) => ({ sourceId: idFor(collection, item, index), value: item }))
    : [{ sourceId: collection, value }];

  if (dryRun) {
    summary[`mirror:${collection}`] = { local: items.length, migrated: 0, dryRun: true };
    return;
  }

  let migrated = 0;
  for (const item of items) {
    const _id = `${collection}:${item.sourceId}`;
    await LocalMirrorRecord.updateOne(
      { _id },
      {
        $set: {
          _id,
          collection,
          sourceId: item.sourceId,
          value: item.value,
          migratedAt: new Date(),
        },
      },
      { upsert: true }
    );
    migrated += 1;
  }

  summary[`mirror:${collection}`] = { local: items.length, migrated };
}

if (env.DB_DRIVER !== "mongo" && !dryRun) {
  console.error("Set DB_DRIVER=mongo before running this migration, or add --dry for an offline plan.");
  process.exit(1);
}

if (!env.MONGO_URI && !dryRun) {
  console.error("Set MONGO_URI before running this migration.");
  process.exit(1);
}

const { dbPath, data } = await readLocalDb();
const backupPath = await backupLocalStore();
const summary = {
  dryRun,
  dbPath,
  backupPath,
  startedAt: new Date().toISOString(),
  collections: {},
  rollback: "Local db.json is not deleted. To roll back app data, keep DB_DRIVER=local_json or restore the backup with npm run db:restore --prefix backend -- <backupPath>.",
};

const comments = flattenComments(data.posts);
const uploads = await collectUploadMetadata(data);

if (dryRun) {
  const mirroredKeys = Object.keys(data)
    .filter((key) => ![
      "users",
      "posts",
      "messages",
      "hashtags",
      "algorithmEvents",
      "reports",
      "notifications",
      "moderationActions",
      "callHistory",
      "sessions",
      "loginChallenges",
      "languageGroups",
    ].includes(key))
    .sort();
  summary.mongo = { connected: false, reason: "Dry run does not write to MongoDB." };
  summary.collections = {
    users: { local: asArray(data.users).length, dryRun: true },
    posts: { local: asArray(data.posts).length, dryRun: true },
    comments: { local: comments.length, dryRun: true },
    messages: { local: asArray(data.messages).length, dryRun: true },
    hashtags: { local: asArray(data.hashtags).length, dryRun: true },
    algorithmEvents: { local: asArray(data.algorithmEvents).length, dryRun: true },
    reports: { local: asArray(data.reports).length, dryRun: true },
    notifications: { local: asArray(data.notifications).length, dryRun: true },
    moderationActions: { local: asArray(data.moderationActions).length, dryRun: true },
    callHistory: { local: asArray(data.callHistory).length, dryRun: true },
    sessions: { local: asArray(data.sessions).length, dryRun: true },
    loginChallenges: { local: asArray(data.loginChallenges).length, dryRun: true },
    languageGroups: { local: asArray(data.languageGroups).length, dryRun: true },
    uploads: { local: uploads.length, missingFiles: uploads.filter((item) => item.missingFile).length, dryRun: true },
    mirroredCollections: { local: mirroredKeys.length, keys: mirroredKeys, dryRun: true },
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

await connectDatabase();
const models = await import("../models/index.js");

for (const model of Object.values(models)) {
  if (model?.createIndexes) await model.createIndexes();
}

await upsertMany(models.User, "users", data.users, summary.collections);
await upsertMany(models.Post, "posts", data.posts, summary.collections);
await upsertMany(models.Comment, "comments", comments, summary.collections);
await upsertMany(models.Message, "messages", data.messages, summary.collections);
await upsertMany(models.Hashtag, "hashtags", data.hashtags, summary.collections);
await upsertMany(models.AlgorithmEvent, "algorithmEvents", data.algorithmEvents, summary.collections);
await upsertMany(models.Report, "reports", data.reports, summary.collections);
await upsertMany(models.Notification, "notifications", data.notifications, summary.collections);
await upsertMany(models.ModerationRecord, "moderationActions", data.moderationActions, summary.collections);
await upsertMany(models.CallLog, "callHistory", asArray(data.callHistory).map(normalizeCallLog), summary.collections);
await upsertMany(models.UserSession, "sessions", asArray(data.sessions).map(normalizeSession), summary.collections);
await upsertMany(models.LoginChallenge, "loginChallenges", asArray(data.loginChallenges).map(normalizeLoginChallenge), summary.collections);
await upsertMany(models.LanguageGroup, "languageGroups", data.languageGroups, summary.collections);
await upsertMany(models.UploadMetadata, "uploads", uploads, summary.collections);

const modelBackedKeys = new Set([
  "users",
  "posts",
  "messages",
  "hashtags",
  "algorithmEvents",
  "reports",
  "notifications",
  "moderationActions",
  "callHistory",
  "sessions",
  "loginChallenges",
  "languageGroups",
]);

for (const key of Object.keys(data).sort()) {
  if (!modelBackedKeys.has(key)) {
    await mirrorCollection(models.LocalMirrorRecord, key, data[key], summary.collections);
  }
}

summary.finishedAt = new Date().toISOString();
summary.uploads = {
  found: uploads.length,
  missingFiles: uploads.filter((item) => item.missingFile).length,
};

await closeDatabase();

console.log(JSON.stringify(summary, null, 2));
