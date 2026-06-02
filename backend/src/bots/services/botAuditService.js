export function botAuditEvent({
  actorId = null,
  actorType = "bot",
  action = "bot_event",
  targetType = null,
  targetId = null,
  reason = "",
  result = "logged",
  meta = {},
} = {}) {
  return {
    actorId,
    actorType,
    action,
    targetType,
    targetId,
    reason,
    result,
    meta,
    createdAt: new Date().toISOString(),
  };
}

