import { notifyBotEvent } from "./botEngine.js";

export function notifyBotNotificationCreated(notification, actorUser) {
  return notifyBotEvent("notification", {
    notification,
    actorUser,
    targetType: "notification",
    targetId: notification?._id,
    text: `${notification?.title || ""} ${notification?.message || ""}`,
  });
}
