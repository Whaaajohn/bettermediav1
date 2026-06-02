import { getDatabaseStatus } from "../config/database.js";
import { env } from "../config/env.js";

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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function plain(value) {
  return JSON.parse(JSON.stringify(value || null));
}

function idFor(collection, item, index) {
  return String(item?._id || item?.id || item?.callId || item?.slug || `${collection}-${index}`);
}

function addDays(date, days) {
  const next = new Date(date || Date.now());
  next.setDate(next.getDate() + days);
  return next;
}

function flattenComments(posts = []) {
  const comments = [];

  function visit(comment, postId, parentId = null, rootId = null, depth = 0) {
    if (!comment) return;
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

function buildCommentTrees(comments = []) {
  const byId = new Map();
  const rootsByPost = new Map();

  for (const comment of comments.map((item) => ({ ...item, replies: [] }))) {
    byId.set(comment._id, comment);
  }

  for (const comment of byId.values()) {
    const parentId = comment.parentId || comment.parentComment;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).replies.push(comment);
    } else {
      const postId = comment.post;
      if (!rootsByPost.has(postId)) rootsByPost.set(postId, []);
      rootsByPost.get(postId).push(comment);
    }
  }

  const sortTree = (items = []) => {
    items.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    items.forEach((item) => sortTree(item.replies));
    return items;
  };

  for (const [postId, roots] of rootsByPost.entries()) rootsByPost.set(postId, sortTree(roots));
  return rootsByPost;
}

function normalizeCallLog(call = {}) {
  return {
    _id: call._id || call.callId,
    callId: call.callId || call._id,
    callerId: call.callerId,
    calleeId: call.calleeId,
    participants: asArray(call.participants).length ? call.participants : [call.callerId, call.calleeId].filter(Boolean),
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

function collectUploadMetadata(data = {}) {
  const uploads = new Map();

  function addUpload({ value, sourceType, sourceId }) {
    const filename = value?.filename || extractFilename(value?.url || value?.publicUrl || value);
    if (!filename) return;
    const url = value?.url || `/uploads/${filename}`;
    uploads.set(`${sourceType}:${sourceId}:${filename}`, {
      _id: `${sourceType}-${sourceId}-${filename}`.replace(/[^a-z0-9_.:-]+/gi, "-").slice(0, 220),
      filename,
      url,
      publicUrl: value?.publicUrl || url,
      mimeType: value?.mimeType || "",
      size: value?.size || 0,
      driver: value?.driver || (env.DB_DRIVER === "mongo" ? "mongo-gridfs" : "local"),
      sourceType,
      sourceId,
    });
  }

  for (const user of asArray(data.users)) addUpload({ value: user.profilePic, sourceType: "profile_picture", sourceId: user._id });
  for (const post of asArray(data.posts)) {
    addUpload({ value: post.media, sourceType: "post", sourceId: post._id });
    addUpload({ value: post.thumbnail, sourceType: "post_thumbnail", sourceId: post._id });
    for (const item of asArray(post.mediaItems)) addUpload({ value: item, sourceType: "post_media_item", sourceId: post._id });
  }
  for (const message of asArray(data.messages)) {
    addUpload({ value: message.media || message.file || message.attachment, sourceType: "message", sourceId: message._id });
    addUpload({ value: message.voice || message.voiceMessage, sourceType: "voice_message", sourceId: message._id });
  }

  return [...uploads.values()];
}

async function upsertAndPrune(model, collection, items = []) {
  const ids = [];
  for (const [index, item] of asArray(items).entries()) {
    if (!item) continue;
    const _id = idFor(collection, item, index);
    ids.push(_id);
    await model.updateOne({ _id }, { $set: { ...item, _id } }, { upsert: true, runValidators: false });
  }
  if (ids.length) await model.deleteMany({ _id: { $nin: ids } });
  else await model.deleteMany({});
}

async function mirrorCollection(LocalMirrorRecord, collection, value) {
  if (value === undefined) return;
  const items = Array.isArray(value)
    ? value.map((item, index) => ({ sourceId: idFor(collection, item, index), value: item }))
    : [{ sourceId: collection, value }];
  const mirrorIds = [];

  for (const item of items) {
    const _id = `${collection}:${item.sourceId}`;
    mirrorIds.push(_id);
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
  }

  if (mirrorIds.length) await LocalMirrorRecord.deleteMany({ collection, _id: { $nin: mirrorIds } });
  else await LocalMirrorRecord.deleteMany({ collection });
}

async function models() {
  return import("../models/index.js");
}

export async function loadDataFromMongo(baseData = {}) {
  if (env.DB_DRIVER !== "mongo" || getDatabaseStatus().driver !== "mongo" || !getDatabaseStatus().connected) return null;
  const m = await models();
  const [
    users,
    posts,
    comments,
    messages,
    hashtags,
    algorithmEvents,
    reports,
    notifications,
    moderationActions,
    callHistory,
    sessions,
    loginChallenges,
    languageGroups,
    mirrors,
  ] = await Promise.all([
    m.User.find({}).lean(),
    m.Post.find({}).lean(),
    m.Comment.find({}).lean(),
    m.Message.find({}).lean(),
    m.Hashtag.find({}).lean(),
    m.AlgorithmEvent.find({}).lean(),
    m.Report.find({}).lean(),
    m.Notification.find({}).lean(),
    m.ModerationRecord.find({}).lean(),
    m.CallLog.find({}).lean(),
    m.UserSession.find({}).lean(),
    m.LoginChallenge.find({}).lean(),
    m.LanguageGroup.find({}).lean(),
    m.LocalMirrorRecord.find({}).lean(),
  ]);

  const data = { ...plain(baseData) };
  for (const mirror of mirrors) {
    if (!modelBackedKeys.has(mirror.collection)) data[mirror.collection] = mirror.value;
  }

  const commentTrees = buildCommentTrees(plain(comments));
  data.users = plain(users);
  data.posts = plain(posts).map((post) => ({
    ...post,
    comments: commentTrees.get(post._id) || [],
  }));
  data.messages = plain(messages);
  data.hashtags = plain(hashtags);
  data.algorithmEvents = plain(algorithmEvents);
  data.reports = plain(reports);
  data.notifications = plain(notifications);
  data.moderationActions = plain(moderationActions);
  data.callHistory = plain(callHistory);
  data.sessions = plain(sessions);
  data.loginChallenges = plain(loginChallenges);
  data.languageGroups = plain(languageGroups);
  return data;
}

export async function persistDataToMongo(data = {}) {
  if (env.DB_DRIVER !== "mongo") return;
  if (!getDatabaseStatus().connected || getDatabaseStatus().driver !== "mongo") return;
  const m = await models();
  await upsertAndPrune(m.User, "users", data.users);
  await upsertAndPrune(m.Post, "posts", data.posts);
  await upsertAndPrune(m.Comment, "comments", flattenComments(data.posts));
  await upsertAndPrune(m.Message, "messages", data.messages);
  await upsertAndPrune(m.Hashtag, "hashtags", data.hashtags);
  await upsertAndPrune(m.AlgorithmEvent, "algorithmEvents", data.algorithmEvents);
  await upsertAndPrune(m.Report, "reports", data.reports);
  await upsertAndPrune(m.Notification, "notifications", data.notifications);
  await upsertAndPrune(m.ModerationRecord, "moderationActions", data.moderationActions);
  await upsertAndPrune(m.CallLog, "callHistory", asArray(data.callHistory).map(normalizeCallLog));
  await upsertAndPrune(m.UserSession, "sessions", asArray(data.sessions).map(normalizeSession));
  await upsertAndPrune(m.LoginChallenge, "loginChallenges", asArray(data.loginChallenges).map(normalizeLoginChallenge));
  await upsertAndPrune(m.LanguageGroup, "languageGroups", data.languageGroups);
  await upsertAndPrune(m.UploadMetadata, "uploads", collectUploadMetadata(data));

  for (const key of Object.keys(data).sort()) {
    if (!modelBackedKeys.has(key)) await mirrorCollection(m.LocalMirrorRecord, key, data[key]);
  }
}
