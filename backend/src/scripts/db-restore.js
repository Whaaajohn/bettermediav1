import fs from "fs/promises";
import path from "path";

import { backupLocalStore, getLocalDbPath } from "../lib/localStore.js";

const source = process.argv[2];
if (!source) {
  console.error("Usage: npm run db:restore -- <backup-file>");
  process.exit(1);
}

const backupFile = path.resolve(process.cwd(), source);
const raw = await fs.readFile(backupFile, "utf8");
JSON.parse(raw);

const currentBackup = await backupLocalStore();
const dbPath = getLocalDbPath();
await fs.copyFile(backupFile, dbPath);

console.log(JSON.stringify({
  success: true,
  restoredFrom: backupFile,
  dbPath,
  previousDbBackup: currentBackup,
}, null, 2));
