// /js/app.js — FINAL PRODUCTION ROUTER
import { state, loadSnapshot, loadFromDexie, saveSnapshot, setLastBackup, getCategories } from "./state.js";
import { dbExportJSON } from "./db.js";
import { EventBus } from "./event-bus.js";

// Constants
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

const SCREEN_IDS = {
  HOME: "home-screen",
  STATS: "stats-screen",
  SETTINGS: "settings-screen-wrap"
};

// Map tabs → screen IDs
// Note: stats and budget share the same screen (tabs within stats-screen)
const ROUTES = {
  home: SCREEN_IDS.HOME,
  stats: SCREEN_IDS.STATS,
  budget: SCREEN_IDS.STATS, // Shares screen with stats
  settings: SCREEN_IDS.SETTINGS,
  ai: null // AI is overlay, not a screen
};

// --------------------------- BOOT ---------------------------
export async function boot() {
  try {
    loadSnapshot();
    setupRouting();
    await loadFromDexie();
    getCategories(); // Preload categories
    setupListeners();
    setupAutoBackupScheduler();

    const initial = location.hash.replace("#", "") || state.lastScreen || "home";
    navigateTo(initial, { replaceHistory: true });
  } catch (err) {
    console.error("Boot failed:", err);
    // Fallback to home screen
    navigateTo("home", { replaceHistory: true });
  }
}

// --------------------------- ROUTER ---------------------------
function setupRouting() {
  // PRIMARY NAVIGATION HANDLER
  EventBus.on("navigate", (payload) => {
    const to = payload?.to;
    if (!to) return;
    navigateTo(to);
  });

  // LEGACY EVENT NAME SUPPORT
  EventBus.on("navigate-to", (to) => {
    if (typeof to === "string") navigateTo(to);
  });

  // BROWSER BACK/FORWARD
  window.addEventListener("popstate", (e) => {
    const screen = e.state?.screen || location.hash.replace("#", "") || "home";
    navigateTo(screen, { replaceHistory: true });
  });
}

export function navigateTo(tab, opts = {}) {
  const { replaceHistory = false } = opts;
  const key = (tab || "").toLowerCase().trim();

  // Validate route exists
  if (!ROUTES.hasOwnProperty(key)) {
    console.warn(`Unknown route: "${tab}", redirecting to home`);
    if (key !== "home") {
      navigateTo("home", opts);
    }
    return;
  }

  // AI is special case - overlay only, updates lastScreen
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
    console.error(`Screen element not found: ${screenId} for route: ${key}`);
    return;
  }

  // Hide all screens
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));

  // Show active screen
  target.classList.remove("hidden");

  // Save last screen
  state.lastScreen = key;
  saveSnapshot();

  // Update URL and history
  updateURL(key, replaceHistory);

  // Notify tab-bar (send object format to match tab-bar's listener)
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

// --------------------------- LISTENERS ---------------------------
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

// --------------------------- AUTO BACKUP ---------------------------
function setupAutoBackupScheduler() {
  // Clear existing interval
  if (window.__autoBackupInterval) {
    clearInterval(window.__autoBackupInterval);
    window.__autoBackupInterval = null;
  }

  if (!state.settings.autoBackup) return;

  // Run immediately if overdue
  const now = Date.now();
  const elapsed = now - (state.lastBackup || 0);

  if (elapsed >= BACKUP_INTERVAL) {
    runAutoBackup();
  }

  // Schedule recurring backups
  window.__autoBackupInterval = setInterval(runAutoBackup, BACKUP_INTERVAL);
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

// --------------------------- AUTO-BOOT ---------------------------
boot();