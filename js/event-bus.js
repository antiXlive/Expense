// event-bus.js
const listeners = new Map();

export const EventBus = {
  on(evt, cb) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(cb);
    return () => this.off(evt, cb);
  },
  off(evt, cb) {
    if (!listeners.has(evt)) return;
    listeners.get(evt).delete(cb);
  },
  emit(evt, payload) {
    if (!listeners.has(evt)) return;
    for (const cb of Array.from(listeners.get(evt))) {
      try { cb(payload); } catch(e){ console.error('Event cb err', e); }
    }
  }
};
