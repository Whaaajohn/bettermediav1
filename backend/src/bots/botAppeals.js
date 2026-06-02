import { notifyBotEvent } from "./botEngine.js";

export function notifyBotAppealCreated(appeal, actorUser) {
  return notifyBotEvent("appeal", {
    appeal,
    actorUser,
    targetType: "appeal",
    targetId: appeal?._id,
    text: appeal?.text || "",
  });
}
