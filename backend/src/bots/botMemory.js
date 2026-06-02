const shortTermMemory = new Map();

export function rememberBotEvent(userId, event) {
  if (!userId) return null;
  const current = shortTermMemory.get(userId) || { count: 0, lastEvents: [] };
  current.count += 1;
  current.lastEvents.unshift({ ...event, at: new Date().toISOString() });
  current.lastEvents = current.lastEvents.slice(0, 20);
  shortTermMemory.set(userId, current);
  return current;
}

export function getBotMemory(userId) {
  return shortTermMemory.get(userId) || { count: 0, lastEvents: [] };
}

export function resetBotMemory() {
  shortTermMemory.clear();
}
