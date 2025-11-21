// /js/state.js
import { db } from "./db.js";

export const state = {
  tx: [],
  cats: [],
  subs: [],
  settings: {
    autoBackup: false,   // FIX: user must enable manually
    useBiometric: false,
    pin: null,
  },
  lastBackup: 0
};

// Load snapshot instantly
export function loadSnapshot() {
  try {
    const ss = JSON.parse(localStorage.getItem("appSnapshot") || "{}");

    if (ss.tx) state.tx = ss.tx;
    if (ss.cats) state.cats = ss.cats;
    if (ss.subs) state.subs = ss.subs;

    if (ss.settings) {
      state.settings = {
        autoBackup: false,
        useBiometric: false,
        pin: null,
        ...ss.settings          // merge inherited
      };
    }

    if (ss.lastBackup) state.lastBackup = ss.lastBackup;
  } catch (e) {
    console.error("Snapshot load error", e);
  }
}

// Save snapshot for instant boot
export function saveSnapshot() {
  localStorage.setItem(
    "appSnapshot",
    JSON.stringify({
      tx: state.tx,
      cats: state.cats,
      subs: state.subs,
      settings: state.settings,
      lastBackup: state.lastBackup
    })
  );
}

export function setLastBackup(ts) {
  state.lastBackup = ts;
  saveSnapshot();
}

// Dexie data load
export async function loadFromDexie() {
  state.tx = await db.transactions.toArray();
  state.cats = await db.categories.toArray();
  state.subs = await db.subcategories.toArray();

  saveSnapshot();
}

export function getSetting(key) {
  return state.settings[key];
}

export function setSetting(key, value) {
  state.settings[key] = value;
  saveSnapshot();
}


