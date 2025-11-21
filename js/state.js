// state.js
import { DB, dbInit } from './db.js';
import { EventBus } from './event-bus.js';
import { uuidv4 } from './utils.js';

const SNAP_KEY = 'em_state_snapshot_v1';

export const state = {
  tx: [],        // transactions (in-memory subset)
  cats: [],      // categories
  subs: [],      // subcategories
  settings: {},  // security & preferences
  lastBackup: null,
  version: 1
};

export async function loadSnapshot() {
  try {
    const s = JSON.parse(localStorage.getItem(SNAP_KEY) || 'null');
    if (!s) return;
    Object.assign(state, s);
    EventBus.emit('snapshot-loaded', state);
  } catch(e){ console.warn('snapshot load failed', e); }
}

export function saveSnapshot() {
  try {
    const sl = {
      tx: state.tx.slice(0,200), // lightweight snapshot (most recent)
      cats: state.cats,
      subs: state.subs,
      settings: state.settings,
      lastBackup: state.lastBackup,
      version: state.version
    };
    localStorage.setItem(SNAP_KEY, JSON.stringify(sl));
    EventBus.emit('snapshot-saved', sl);
  } catch(e){ console.warn('snapshot save failed', e); }
}

export async function loadFromDexie() {
  await dbInit();
  const [transactions, categories, subcategories, settings] = await Promise.all([
    DB.transactions.orderBy('date').reverse().limit(500).toArray(),
    DB.categories.orderBy('order').toArray(),
    DB.subcategories.toArray(),
    DB.settings.toArray()
  ]);
  state.tx = transactions;
  state.cats = categories;
  state.subs = subcategories;
  state.settings = Object.fromEntries((settings || []).map(s => [s.key, s.value]));
  EventBus.emit('db-loaded', { tx: state.tx, cats: state.cats, subs: state.subs, settings: state.settings });
  saveSnapshot();
}

export async function addTransaction(tx) {
  tx.id = tx.id || uuidv4();
  tx.createdAt = new Date().toISOString();
  await DB.transactions.add(tx);
  state.tx.unshift(tx);
  EventBus.emit('tx-added', tx);
  saveSnapshot();
}

export async function updateTransaction(tx) {
  tx.updatedAt = new Date().toISOString();
  await DB.transactions.put(tx);
  const idx = state.tx.findIndex(t => t.id === tx.id);
  if (idx >= 0) state.tx[idx] = tx;
  EventBus.emit('tx-updated', tx);
  saveSnapshot();
}

export async function deleteTransaction(id) {
  await DB.transactions.delete(id);
  state.tx = state.tx.filter(t => t.id !== id);
  EventBus.emit('tx-deleted', id);
  saveSnapshot();
}

export async function addCategory(cat) {
  cat.id = cat.id || uuidv4();
  await DB.categories.add(cat);
  state.cats = await DB.categories.orderBy('order').toArray();
  EventBus.emit('category-updated');
  saveSnapshot();
}

export async function removeCategory(catId) {
  // cascade handling: set tx.catId/subId to null on affected tx
  await DB.transaction('rw', DB.categories, DB.subcategories, DB.transactions, async () => {
    await DB.categories.delete(catId);
    await DB.subcategories.where('catId').equals(catId).delete();
    const affected = await DB.transactions.where('catId').equals(catId).toArray();
    for (const t of affected) {
      t.catId = null; t.subId = null;
      await DB.transactions.put(t);
    }
  });
  state.cats = await DB.categories.orderBy('order').toArray();
  state.tx = await DB.transactions.orderBy('date').reverse().limit(500).toArray();
  EventBus.emit('category-updated');
  saveSnapshot();
}

export async function addSubcategory(sub) {
  sub.id = sub.id || uuidv4();
  await DB.subcategories.add(sub);
  state.subs = await DB.subcategories.toArray();
  EventBus.emit('category-updated');
  saveSnapshot();
}

export async function removeSubcategory(subId) {
  await DB.transaction('rw', DB.subcategories, DB.transactions, async () => {
    const sub = await DB.subcategories.get(subId);
    if (!sub) return;
    await DB.subcategories.delete(subId);
    const affected = await DB.transactions.where('subId').equals(subId).toArray();
    for (const t of affected) { t.subId = null; await DB.transactions.put(t); }
  });
  state.subs = await DB.subcategories.toArray();
  state.tx = await DB.transactions.orderBy('date').reverse().limit(500).toArray();
  EventBus.emit('category-updated');
  saveSnapshot();
}

/* settings */
export async function setSetting(key, value) {
  await DB.settings.put({ key, value });
  state.settings[key] = value;
  EventBus.emit('settings-updated', { key, value });
  saveSnapshot();
}

export async function getSetting(key, fallback) {
  if (key in state.settings) return state.settings[key];
  const rec = await DB.settings.get(key);
  return rec ? rec.value : fallback;
}

/* backup timestamp */
export function setLastBackup(ts) {
  state.lastBackup = ts;
  saveSnapshot();
}
