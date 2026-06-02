import { EventEmitter } from "events";

export const botEvents = new EventEmitter();
botEvents.setMaxListeners(50);

export function emitBotEvent(type, payload = {}) {
  botEvents.emit(type, {
    ...payload,
    type,
    emittedAt: new Date().toISOString(),
  });
}

export function onBotEvent(type, handler) {
  botEvents.on(type, handler);
  return () => botEvents.off(type, handler);
}
