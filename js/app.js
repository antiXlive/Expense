// /js/app.js — FINAL PRODUCTION ROUTER + TX HANDLERS
import {
  state,
  loadSnapshot,
  loadFromDexie,
  saveSnapshot,
  setLastBackup,
  getCategories
} from "./state.js";

import { dbExportJSON, db } from "./db.js";
import { EventBus } from "./event-bus.js";

// ======================================================
//                   CONSTANTS
// ======================================================
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

const SCREEN_IDS = {
  HOME: "home-screen",
  STATS: "stats-screen",
  SETTINGS: "settings-screen-wrap"
};

const ROUTES = {
  home: SCREEN_IDS.HOME,
  stats: SCREEN_IDS.STATS,
  budget: SCREEN_IDS.STATS,
  settings: SCREEN_IDS.SETTINGS,
  ai: null
};

// ======================================================
//       IMPORTANT: TRANSACTION CATEGORY ENRICHER
// ======================================================
function enrichTx(raw) {
  const cat = state.categories.find(c => c.id === raw.catId);
  const sub = state.subcategories.find(s => s.id === raw.subId);

  return {
    ...raw,
    catName: cat?.name || null,
    emoji: cat?.emoji || "🏷️",
    subName: sub?.name || null
  };
}

// ======================================================
//            TRANSACTION EVENT HANDLERS
// ======================================================

// ---- ADD ----
EventBus.on("tx-add", async (data) => {
  const tx = enrichTx(data);

  const id = await db.transactions.add(tx);
  tx.id = id;

  state.tx.push(tx);
  saveSnapshot();

  EventBus.emit("tx-added", tx);
  EventBus.emit("tx-updated", tx);
  EventBus.emit("db-loaded", { tx: state.tx });
});

// ---- SAVE / UPDATE ----
EventBus.on("tx-save", async (data) => {
  const tx = enrichTx(data);

  await db.transactions.put(tx);

  const i = state.tx.findIndex(t => t.id === tx.id);
  if (i !== -1) state.tx[i] = tx;

  saveSnapshot();

  EventBus.emit("tx-updated", tx);
  EventBus.emit("tx-saved", tx);
  EventBus.emit("db-loaded", { tx: state.tx });
});

// ---- DELETE ----
EventBus.on("tx-delete", async (id) => {
  await db.transactions.delete(id);

  state.tx = state.tx.filter(t => t.id !== id);
  saveSnapshot();

  EventBus.emit("tx-deleted", id);
  EventBus.emit("tx-updated", id);
  EventBus.emit("db-loaded", { tx: state.tx });
});

// ======================================================
//                      BOOT
// ======================================================
export async function boot() {
  try {
    loadSnapshot();
    setupRouting();

    await loadFromDexie();
    getCategories();

    setupListeners();
    setupAutoBackupScheduler();

    const initial = location.hash.replace("#", "") || state.lastScreen || "home";
    navigateTo(initial, { replaceHistory: true });
  } catch (err) {
    console.error("Boot failed:", err);
    navigateTo("home", { replaceHistory: true });
  }
}

// ======================================================
//                      ROUTER
// ======================================================
function setupRouting() {
  EventBus.on("navigate", ({ to }) => {
    if (to) navigateTo(to);
  });

  EventBus.on("navigate-to", (to) => {
    if (typeof to === "string") navigateTo(to);
  });

  window.addEventListener("popstate", (e) => {
    const screen = e.state?.screen || location.hash.replace("#", "") || "home";
    navigateTo(screen, { replaceHistory: true });
  });
}

export function navigateTo(tab, opts = {}) {
  const key = (tab || "").toLowerCase().trim();
  const { replaceHistory = false } = opts;

  if (!ROUTES.hasOwnProperty(key)) {
    console.warn(`Unknown route "${key}", redirecting to home`);
    return navigateTo("home", opts);
  }

  if (key === "ai") {
    state.lastScreen = "ai";
    saveSnapshot();
    EventBus.emit("open-ai", {});
    EventBus.emit("navigated", { to: "ai" });
    updateURL("ai", replaceHistory);
    return;
  }

  const screenId = ROUTES[key];
  const target = document.getElementById(screenId);

  if (!target) {
    console.error(`Screen not found: ${screenId}`);
    return;
  }

  document.querySelectorAll(".screen")
    .forEach(s => s.classList.add("hidden"));

  target.classList.remove("hidden");

  state.lastScreen = key;
  saveSnapshot();

  updateURL(key, replaceHistory);

  EventBus.emit("navigated", { to: key });
}

function updateURL(key, replaceHistory) {
  const hash = `#${key}`;
  if (replaceHistory) {
    history.replaceState({ screen: key }, "", hash);
  } else {
    history.pushState({ screen: key }, "", hash);
  }
}

// ======================================================
//                     SETTINGS LISTENER
// ======================================================
function setupListeners() {
  EventBus.on("settings-update", (updates) => {
    try {
      Object.assign(state.settings, updates);
      saveSnapshot();
      setupAutoBackupScheduler();
    } catch (err) {
      console.error("Settings update failed:", err);
    }
  });
}

// ======================================================
//                     AUTO BACKUP
// ======================================================
function setupAutoBackupScheduler() {
  if (window.__autoBackupInterval) {
    clearInterval(window.__autoBackupInterval);
    window.__autoBackupInterval = null;
  }

  if (!state.settings.autoBackup) return;

  const now = Date.now();
  const elapsed = now - (state.lastBackup || 0);

  if (elapsed >= BACKUP_INTERVAL) {
    runAutoBackup();
  }

  window.__autoBackupInterval = setInterval(
    runAutoBackup,
    BACKUP_INTERVAL
  );
}

export function runAutoBackup() {
  if (!state.settings.autoBackup) return;

  try {
    dbExportJSON();
    setLastBackup(Date.now());
  } catch (err) {
    console.error("Auto-backup failed:", err);
  }
}

// ======================================================
//                     AUTO BOOT
// ======================================================
boot();
