// /js/app.js
import { state, loadSnapshot, loadFromDexie, saveSnapshot, setLastBackup } from "./state.js";
import { dbExportJSON } from "./db.js";
import { EventBus } from "./event-bus.js";

const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export async function boot() {
  loadSnapshot();       // instant UI
  await loadFromDexie(); // real DB sync

  setupListeners();
  setupAutoBackupScheduler(); // FIX
}

function setupListeners() {
  EventBus.on("settings-update", (updates) => {
    Object.assign(state.settings, updates);
    saveSnapshot();
    setupAutoBackupScheduler();   // re-evaluate backup ON/OFF
  });

  // Navigation events, etc handled here...
}

function setupAutoBackupScheduler() {
  // Clear old interval if exists
  if (window.__autoBackupInterval) {
    clearInterval(window.__autoBackupInterval);
    window.__autoBackupInterval = null;
  }

  // FIX: If user has not enabled auto backup → stop here
  if (!state.settings.autoBackup) {
    console.log("Auto-backup disabled.");
    return;
  }

  // Create new interval only when enabled
  window.__autoBackupInterval = setInterval(() => {
    runAutoBackup();
  }, BACKUP_INTERVAL);

  console.log("Auto-backup enabled.");
}

export function runAutoBackup() {
  if (!state.settings.autoBackup) return;

  const now = Date.now();
  const elapsed = now - (state.lastBackup || 0);

  if (elapsed >= BACKUP_INTERVAL) {
    dbExportJSON();           // Only runs IF user enabled
    setLastBackup(now);
  }
}
