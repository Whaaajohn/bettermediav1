import { env } from "../config/env.js";

const alwaysBlocked = new Set([
  "full_ban",
  "delete_user",
  "clear_audit_logs",
  "make_admin",
  "remove_admin",
  "change_server_settings",
]);

export function normalizeActionName(action = "log") {
  return action.toString().trim().toLowerCase().replace(/-/g, "_");
}

export function canBotPerform(action) {
  const normalized = normalizeActionName(action);
  if (alwaysBlocked.has(normalized)) return false;
  if (normalized === "report") return env.BOT_CAN_CREATE_REPORTS;
  if (normalized === "warn") return env.BOT_CAN_WARN;
  if (normalized === "hide_content") return env.BOT_CAN_HIDE_CONTENT;
  if (normalized === "temp_mute") return env.BOT_CAN_TEMP_MUTE;
  if (normalized === "restrict") return env.BOT_CAN_TEMP_RESTRICT;
  if (normalized === "temp_ban") return env.BOT_CAN_TEMP_BAN;
  if (normalized === "log" || normalized === "escalate") return true;
  return false;
}

export function botPermissionSummary() {
  return {
    createReports: env.BOT_CAN_CREATE_REPORTS,
    warn: env.BOT_CAN_WARN,
    hideContent: env.BOT_CAN_HIDE_CONTENT,
    tempMute: env.BOT_CAN_TEMP_MUTE,
    tempRestrict: env.BOT_CAN_TEMP_RESTRICT,
    tempBan: env.BOT_CAN_TEMP_BAN,
    fullBan: false,
    deleteUsers: false,
    clearLogs: false,
    changeAdmin: false,
    autoActions: env.ALLOW_BOT_AUTO_ACTIONS,
  };
}
