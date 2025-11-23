// /js/state.js
import { db } from "./db.js";
import { DEFAULT_CATEGORIES } from "./default-cats.js";

export const state = {
  tx: [],
  categories: [],      // flattened categories (Dexie)
  subcategories: [],   // flattened subcategories (Dexie)
  settings: {
    autoBackup: false,
    useBiometric: false,
    pin: null,
  },
  lastBackup: 0
};

// -------------------------------------------------------------
// SNAPSHOT — loads instantly (fast boot)
// -------------------------------------------------------------
export function loadSnapshot() {
  try {
    const ss = JSON.parse(localStorage.getItem("appSnapshot") || "{}");

    state.tx = ss.tx || [];
    state.categories = ss.categories || [];
    state.subcategories = ss.subcategories || [];

    state.settings = {
      autoBackup: false,
      useBiometric: false,
      pin: null,
      ...(ss.settings || {})
    };

    state.lastBackup = ss.lastBackup || 0;
  } catch (e) {
    console.error("Snapshot load error:", e);
  }
}

export function saveSnapshot() {
  localStorage.setItem(
    "appSnapshot",
    JSON.stringify({
      tx: state.tx,
      categories: state.categories,
      subcategories: state.subcategories,
      settings: state.settings,
      lastBackup: state.lastBackup
    })
  );
}

export function setLastBackup(ts) {
  state.lastBackup = ts;
  saveSnapshot();
}

// -------------------------------------------------------------
// FIRST RUN → Insert DEFAULT categories into Dexie
// -------------------------------------------------------------
async function initDefaultCategoriesIfNeeded() {
  const count = await db.categories.count();
  if (count > 0) return; // already have data

  console.log("📌 Loading default categories into Dexie...");

  for (const cat of DEFAULT_CATEGORIES) {
    const catId = await db.categories.add({
      name: cat.name,
      emoji: cat.emoji
    });

    if (cat.subcategories && cat.subcategories.length) {
      const subs = cat.subcategories.map(sub => ({
        catId,
        name: sub.name
      }));
      await db.subcategories.bulkAdd(subs);
    }
  }

  console.log("✅ Default categories added");
}

// -------------------------------------------------------------
// LOAD FROM DEXIE
// -------------------------------------------------------------
export async function loadFromDexie() {
  await initDefaultCategoriesIfNeeded();

  state.tx = await db.transactions.toArray();
  state.categories = await db.categories.toArray();
  state.subcategories = await db.subcategories.toArray();

  saveSnapshot();
}

// -------------------------------------------------------------
// SETTINGS API
// -------------------------------------------------------------
export function getSetting(key) {
  return state.settings[key];
}

export function setSetting(key, value) {
  state.settings[key] = value;
  saveSnapshot();
}

// -------------------------------------------------------------
// CATEGORY API (used by Settings + Entry Sheet)
// -------------------------------------------------------------
export function getCategories() {
  // Returns fully joined categories with subcategories
  return state.categories.map(cat => {
    const subs = state.subcategories.filter(s => s.catId === cat.id);
    return {
      ...cat,
      subcategories: subs
    };
  });
}

export async function setCategories(list) {
  // Overwriting categories means resetting Dexie tables
  try {
    await db.categories.clear();
    await db.subcategories.clear();

    for (const cat of list) {
      const catId = await db.categories.add({
        name: cat.name,
        emoji: cat.emoji || "🏷️"
      });

      if (cat.subcategories && cat.subcategories.length) {
        const subs = cat.subcategories.map(sub => ({
          catId,
          name: sub.name
        }));
        await db.subcategories.bulkAdd(subs);
      }
    }

    // Reload into state
    state.categories = await db.categories.toArray();
    state.subcategories = await db.subcategories.toArray();
    saveSnapshot();
  } catch (e) {
    console.error("setCategories error:", e);
  }
}

// -------------------------------------------------------------
// CLEAR ALL APP DATA
// -------------------------------------------------------------
export async function clearAll() {
  await db.transactions.clear();
  await db.categories.clear();
  await db.subcategories.clear();
  await db.settings.clear();

  // Reset to defaults
  await initDefaultCategoriesIfNeeded();
  state.tx = [];
  state.settings = {
    autoBackup: false,
    useBiometric: false,
    pin: null,
  };

  saveSnapshot();
}
