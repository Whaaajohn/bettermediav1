import fs from "fs/promises";

import { getLocalDbPath } from "../lib/localStore.js";

const dbPath = getLocalDbPath();
const raw = await fs.readFile(dbPath, "utf8");
const data = JSON.parse(raw);

console.log(JSON.stringify({
  success: true,
  dbPath,
  users: data.users?.length || 0,
  posts: data.posts?.length || 0,
  messages: data.messages?.length || 0,
  comments: (data.posts || []).reduce((count, post) => count + (post.comments?.length || 0), 0),
}, null, 2));
