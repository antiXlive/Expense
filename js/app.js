// /js/app.js — REFACTORED: ROUTER-ONLY ARCHITECTURE
import {
  state,
  loadSnapshot,
  loadFromDexie,
  saveSnapshot,
  setLastBackup,
  getCategories,
  addTransaction,
  updateTransaction,
  deleteTransaction
} from "./state.js";

import { dbExportJSON } from "./db.js";
import { EventBus } from "./event-bus.js";

// ======================================================
//                   CONSTANTS
// ======================================================
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

const SCREEN_IDS = {
  HOME: "home-screen",
  AI: "ai-screen",
  STATS: "stats-screen",
  SETTINGS: "settings-screen-wrap"
};

const ROUTES = {
  home: SCREEN_IDS.HOME,
  ai: SCREEN_IDS.AI,
  stats: SCREEN_IDS.STATS,
  budget: SCREEN_IDS.STATS,
  settings: SCREEN_IDS.SETTINGS
};

// ======================================================
//            TRANSACTION EVENT HANDLERS
//         (Now just thin wrappers to state.js)
// ======================================================

EventBus.on("tx-add", async (data) => {
  try {
    await addTransaction(data);
  } catch (err) {
    console.error("Failed to add transaction:", err);
    EventBus.emit("tx-error", { action: "add", error: err.message });
  }
});

EventBus.on("tx-save", async (data) => {
  try {
    await updateTransaction(data);
  } catch (err) {
    console.error("Failed to update transaction:", err);
    EventBus.emit("tx-error", { action: "update", error: err.message });
  }
});

EventBus.on("tx-delete", async (id) => {
  try {
    await deleteTransaction(id);
  } catch (err) {
    console.error("Failed to delete transaction:", err);
    EventBus.emit("tx-error", { action: "delete", error: err.message });
  }
});

// ======================================================
//                      BOOT
// ======================================================
export async function boot() {
  try {
    console.log("🚀 Booting application...");
    
    // 1. Load snapshot for instant UI
    loadSnapshot();
    
    // 2. Setup routing system
    setupRouting();

    // 3. Load fresh data from IndexedDB
    await loadFromDexie();
    
    // 4. Get enriched categories
    getCategories();

    // 5. Setup event listeners
    setupListeners();
    
    // 6. Setup auto-backup scheduler
    setupAutoBackupScheduler();

    // 7. Navigate to initial screen
    const initialScreen = location.hash.replace("#", "") || state.lastScreen || "home";
    navigateTo(initialScreen, { replaceHistory: true });
    
    console.log("✅ Boot complete!");
  } catch (err) {
    console.error("❌ Boot failed:", err);
    navigateTo("home", { replaceHistory: true });
  }
}

// ======================================================
//                      ROUTER
// ======================================================
function setupRouting() {
  // Handle navigate events
  EventBus.on("navigate", ({ to }) => {
    if (to) navigateTo(to);
  });

  EventBus.on("navigate-to", (to) => {
    if (typeof to === "string") navigateTo(to);
  });

  // Handle browser back/forward buttons
  window.addEventListener("popstate", (e) => {
    const screen = e.state?.screen || location.hash.replace("#", "") || "home";
    navigateTo(screen, { replaceHistory: true });
  });
}

/**
 * Navigate to a specific screen
 * @param {string} tab - Route name (home, stats, settings, ai)
 * @param {Object} opts - Options { replaceHistory: boolean }
 */
export function navigateTo(tab, opts = {}) {
  const key = (tab || "").toLowerCase().trim();
  const { replaceHistory = false } = opts;

  // Validate route
  if (!ROUTES.hasOwnProperty(key)) {
    console.warn(`Unknown route "${key}", redirecting to home`);
    return navigateTo("home", opts);
  }

  // Get screen element
  const screenId = ROUTES[key];
  const target = document.getElementById(screenId);

  if (!target) {
    console.error(`Screen element not found: ${screenId}`);
    return;
  }

  // Hide all screens
  document.querySelectorAll(".screen")
    .forEach(s => s.classList.add("hidden"));

  // Show target screen
  target.classList.remove("hidden");

  // Update state
  state.lastScreen = key;
  saveSnapshot();

  // Update URL
  updateURL(key, replaceHistory);

  // Emit navigation event
  EventBus.emit("navigated", { to: key });
  
  console.log(`📍 Navigated to: ${key}`);
}

/**
 * Update browser URL and history
 * @param {string} key - Route name
 * @param {boolean} replaceHistory - Replace instead of push
 */
function updateURL(key, replaceHistory) {
  const hash = `#${key}`;
  if (replaceHistory) {
    history.replaceState({ screen: key }, "", hash);
  } else {
    history.pushState({ screen: key }, "", hash);
  }
}

// ======================================================
//                     EVENT LISTENERS
// ======================================================
function setupListeners() {
  // Settings update handler
  EventBus.on("settings-update", (updates) => {
    try {
      Object.assign(state.settings, updates);
      saveSnapshot();
      
      // Re-setup auto-backup if settings changed
      setupAutoBackupScheduler();
      
      console.log("⚙️ Settings updated:", updates);
    } catch (err) {
      console.error("Settings update failed:", err);
    }
  });
}

// ======================================================
//                     AUTO BACKUP
// ======================================================
function setupAutoBackupScheduler() {
  // Clear existing interval
  if (window.__autoBackupInterval) {
    clearInterval(window.__autoBackupInterval);
    window.__autoBackupInterval = null;
  }

  // Exit if auto-backup is disabled
  if (!state.settings.autoBackup) {
    console.log("📴 Auto-backup disabled");
    return;
  }

  // Check if backup is due
  const now = Date.now();
  const elapsed = now - (state.lastBackup || 0);

  if (elapsed >= BACKUP_INTERVAL) {
    console.log("⏰ Running overdue backup...");
    runAutoBackup();
  }

  // Schedule recurring backups
  window.__autoBackupInterval = setInterval(
    runAutoBackup,
    BACKUP_INTERVAL
  );
  
  console.log("✅ Auto-backup scheduler started");
}

/**
 * Execute automatic backup
 */
export function runAutoBackup() {
  if (!state.settings.autoBackup) {
    console.log("⏭️ Skipping backup (disabled)");
    return;
  }

  try {
    console.log("💾 Running auto-backup...");
    dbExportJSON();
    setLastBackup(Date.now());
    console.log("✅ Auto-backup complete!");
  } catch (err) {
    console.error("❌ Auto-backup failed:", err);
    EventBus.emit("backup-error", { error: err.message });
  }
}

// ======================================================
//                     AUTO BOOT
// ======================================================
boot();