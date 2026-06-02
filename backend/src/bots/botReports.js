import { notifyBotEvent } from "./botEngine.js";

function userIdFrom(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id || value.id || null;
}

function reportTargetUserId(report) {
  const target = report?.target || {};

  if (report?.targetType === "user") return report.targetId || userIdFrom(target);
  if (report?.targetType === "post") return userIdFrom(target.author);
  if (report?.targetType === "comment") return userIdFrom(target.author);
  if (report?.targetType === "message") return userIdFrom(target.sender);

  return null;
}

function reportTargetText(report) {
  const target = report?.target || {};

  if (report?.targetType === "post") {
    return [target.text, target.content, target.caption]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join("\n");
  }

  if (report?.targetType === "comment") {
    return String(target.text || "").trim();
  }

  if (report?.targetType === "message") {
    return String(target.text || "").trim();
  }

  if (report?.targetType === "user") {
    return [target.username && `@${target.username}`, target.fullName, target.bio]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

export function notifyBotReportCreated(report, actorUser) {
  const targetText = reportTargetText(report);
  const reportContext = `${report?.category || ""} ${report?.reason || ""} ${report?.details || ""}`.trim();

  return notifyBotEvent("report", {
    report,
    actorUser,
    source: "user-report",
    targetType: report?.targetType || "report",
    targetId: report?.targetId || report?._id,
    targetUserId: reportTargetUserId(report),
    text: targetText || reportContext,
    reportContext,
    priority: "high",
  });
}
