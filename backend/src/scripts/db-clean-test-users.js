import fs from "fs/promises";

import { backupLocalStore, getLocalDbPath } from "../lib/localStore.js";

const dbPath = getLocalDbPath();
const raw = await fs.readFile(dbPath, "utf8");
const data = JSON.parse(raw);
const protectedRoles = new Set(["creator", "admin", "mod"]);
const testUsers = new Set(
  (data.users || [])
    .filter((user) => !protectedRoles.has(user.role))
    .filter((user) => user.email?.endsWith("@test.local") || user.username?.startsWith("lwtest_"))
    .map((user) => user._id)
);

if (!testUsers.size) {
  console.log(JSON.stringify({ success: true, deletedUsers: 0, message: "No test users found." }, null, 2));
  process.exit(0);
}

const backupPath = await backupLocalStore();
data.users = (data.users || [])
  .filter((user) => !testUsers.has(user._id))
  .map((user) => ({
    ...user,
    followers: (user.followers || []).filter((id) => !testUsers.has(id)),
    following: (user.following || []).filter((id) => !testUsers.has(id)),
    friends: (user.friends || []).filter((id) => !testUsers.has(id)),
  }));

const removedPostIds = new Set(
  (data.posts || [])
    .filter((post) => testUsers.has(post.author))
    .map((post) => post._id)
);

data.posts = (data.posts || [])
  .filter((post) => !testUsers.has(post.author) && !removedPostIds.has(post.repostOf))
  .map((post) => ({
    ...post,
    likes: (post.likes || []).filter((id) => !testUsers.has(id)),
    dislikes: (post.dislikes || []).filter((id) => !testUsers.has(id)),
    saves: (post.saves || []).filter((id) => !testUsers.has(id)),
    comments: (post.comments || [])
      .filter((comment) => !testUsers.has(comment.author))
      .map((comment) => ({
        ...comment,
        likes: (comment.likes || []).filter((id) => !testUsers.has(id)),
        replies: (comment.replies || []).filter((reply) => !testUsers.has(reply.author)),
      })),
  }));

data.messages = (data.messages || []).filter((message) => !testUsers.has(message.sender) && !testUsers.has(message.receiver));
data.notifications = (data.notifications || []).filter((item) => !testUsers.has(item.user) && !testUsers.has(item.actorId));
data.reports = (data.reports || []).filter((item) => !testUsers.has(item.reporter));
data.algorithmEvents = (data.algorithmEvents || []).filter((item) => !testUsers.has(item.user));

await fs.writeFile(dbPath, JSON.stringify(data, null, 2));

console.log(JSON.stringify({
  success: true,
  deletedUsers: testUsers.size,
  removedPosts: removedPostIds.size,
  backupPath,
}, null, 2));
