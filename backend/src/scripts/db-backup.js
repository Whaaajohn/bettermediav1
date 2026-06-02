import { backupLocalStore, getLocalDbPath } from "../lib/localStore.js";

const backupPath = await backupLocalStore();

console.log(JSON.stringify({
  success: Boolean(backupPath),
  dbPath: getLocalDbPath(),
  backupPath,
  message: backupPath ? "Local database backup created." : "No database file existed to back up.",
}, null, 2));
