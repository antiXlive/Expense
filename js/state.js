// /js/state.js
import { db } from "./db.js";
import { DEFAULT_CATEGORIES } from "./default-cats.js";

//
// ======================================================
//                GLOBAL APPLICATION STATE
// ======================================================
export const state = {
  tx: [],
  categories: [],
  subcategories: [],

  settings: {
    autoBackup: false,
    useBiometric: false,
    pin: null,
  },

  lastBackup: 0,
};

//
// ======================================================
//                SNAPSHOT (FAST OFFLINE BOOT)
// ======================================================
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
      ...(ss.settings || {}),
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
      lastBackup: state.lastBackup,
    })
  );
}

export function setLastBackup(ts) {
  state.lastBackup = ts;
  saveSnapshot();
}

//
// ======================================================
//     DEFAULT CATEGORY INITIALIZATION (CORRUPTION SAFE)
// ======================================================
async function initDefaultCategoriesIfNeeded() {
  const existing = await db.categories.toArray();

  // 1️⃣ If database is completely empty → load defaults
  if (existing.length === 0) {
    console.log("📌 Installing default categories (empty DB)...");
    await loadDefaults();
    return;
  }

  // 2️⃣ Check for corrupted entries (null or empty names)
  const corrupted = existing.filter(c => !c.name || c.name.trim() === "");
  
  if (corrupted.length > 0) {
    console.warn(`⚠️ Found ${corrupted.length} corrupted categories, removing...`);
    // Delete corrupted entries by ID
    for (const cat of corrupted) {
      await db.categories.delete(cat.id);
      // Also delete their subcategories
      await db.subcategories.where('catId').equals(cat.id).delete();
    }
  }

  // 3️⃣ Check for duplicate category names
  const names = existing
    .filter(c => c.name && c.name.trim()) // Only valid names
    .map(c => c.name.trim());
  
  const uniqueNames = new Set(names);
  
  if (names.length !== uniqueNames.size) {
    console.warn("⚠️ Duplicate categories detected, cleaning up...");
    
    // Find which names are duplicated
    const nameCounts = new Map();
    for (const name of names) {
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
    
    const duplicateNames = Array.from(nameCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([name, _]) => name);
    
    console.warn("Duplicates:", duplicateNames);
    
    // For each duplicate name, keep only the first one
    for (const dupName of duplicateNames) {
      const cats = await db.categories.where('name').equals(dupName).toArray();
      // Keep the first, delete the rest
      for (let i = 1; i < cats.length; i++) {
        await db.categories.delete(cats[i].id);
        await db.subcategories.where('catId').equals(cats[i].id).delete();
      }
    }
  }

  // 4️⃣ After cleanup, reload and check if we need defaults
  const cleanedCategories = await db.categories.toArray();
  
  // If after cleanup we have no categories, load defaults
  if (cleanedCategories.length === 0) {
    console.log("📌 No categories after cleanup, loading defaults...");
    await loadDefaults();
  }
}

// Actual inserter - ONLY called when we're sure DB is empty
async function loadDefaults() {
  try {
    // First, verify DEFAULT_CATEGORIES doesn't have duplicates
    const defaultNames = DEFAULT_CATEGORIES.map(c => c.name);
    const uniqueDefaultNames = new Set(defaultNames);
    
    if (defaultNames.length !== uniqueDefaultNames.size) {
      console.error("❌ DEFAULT_CATEGORIES has duplicates:", defaultNames);
      // Find and log duplicates
      const nameCounts = {};
      defaultNames.forEach(name => {
        nameCounts[name] = (nameCounts[name] || 0) + 1;
      });
      const dups = Object.entries(nameCounts).filter(([_, count]) => count > 1);
      console.error("Duplicate categories in defaults:", dups);
    }
    
    // Use Set to deduplicate based on name
    const seenNames = new Set();
    const uniqueCategories = DEFAULT_CATEGORIES.filter(cat => {
      if (seenNames.has(cat.name)) {
        console.warn(`⚠️ Skipping duplicate in DEFAULT_CATEGORIES: ${cat.name}`);
        return false;
      }
      seenNames.add(cat.name);
      return true;
    });
    
    console.log(`📦 Loading ${uniqueCategories.length} unique default categories...`);
    
    for (const cat of uniqueCategories) {
      // Double-check database one more time
      const exists = await db.categories
        .where('name')
        .equals(cat.name)
        .first();
      
      if (exists) {
        console.log(`⏭️ Skipping "${cat.name}" - already exists with ID ${exists.id}`);
        continue;
      }

      const catId = await db.categories.add({
        name: cat.name,
        emoji: cat.emoji
      });
      
      console.log(`✓ Added "${cat.name}" with ID ${catId}`);

      if (cat.subcategories?.length) {
        await db.subcategories.bulkAdd(
          cat.subcategories.map(sub => ({
            catId,
            name: sub.name
          }))
        );
        console.log(`  ↳ Added ${cat.subcategories.length} subcategories`);
      }
    }
    
    const finalCount = await db.categories.count();
    console.log(`✅ Defaults loaded successfully. Total categories: ${finalCount}`);
  } catch (e) {
    console.error("❌ Error loading defaults:", e);
    throw e;
  }
}

//
// ======================================================
//                LOAD FROM DEXIE DATABASE
// ======================================================
export async function loadFromDexie() {
  await initDefaultCategoriesIfNeeded();

  state.tx = await db.transactions.toArray();
  state.categories = await db.categories.toArray();
  state.subcategories = await db.subcategories.toArray();

  saveSnapshot();
}

//
// ======================================================
//                     SETTINGS API
// ======================================================
export function getSetting(key) {
  return state.settings[key];
}

export function setSetting(key, value) {
  state.settings[key] = value;
  saveSnapshot();
}

//
// ======================================================
//                CATEGORIES + SUBCATEGORIES API
// ======================================================
export function getCategories() {
  return state.categories.map((cat) => {
    const subs = state.subcategories.filter((s) => s.catId === cat.id);
    return {
      ...cat,
      subcategories: subs,
    };
  });
}

export async function setCategories(list) {
  try {
    await db.categories.clear();
    await db.subcategories.clear();

    for (const cat of list) {
      const catId = await db.categories.add({
        name: cat.name,
        emoji: cat.emoji || "🏷️",
      });

      if (cat.subcategories?.length) {
        await db.subcategories.bulkAdd(
          cat.subcategories.map((s) => ({
            catId,
            name: s.name,
          }))
        );
      }
    }

    state.categories = await db.categories.toArray();
    state.subcategories = await db.subcategories.toArray();

    saveSnapshot();
  } catch (e) {
    console.error("setCategories error:", e);
  }
}

//
// ======================================================
//                 CLEAR ALL APP DATA
// ======================================================
export async function clearAll() {
  await db.transactions.clear();
  await db.categories.clear();
  await db.subcategories.clear();
  await db.settings.clear();

  state.tx = [];
  state.settings = {
    autoBackup: false,
    useBiometric: false,
    pin: null,
  };

  await initDefaultCategoriesIfNeeded();
  
  // Reload state after clearing
  state.categories = await db.categories.toArray();
  state.subcategories = await db.subcategories.toArray();
  
  saveSnapshot();
}

//
// ======================================================
//              ONE-TIME CLEANUP UTILITY
// ======================================================
// Run this once in console to fix existing duplicates:
// import { cleanupDuplicateCategories } from './js/state.js'
// await cleanupDuplicateCategories()
export async function cleanupDuplicateCategories() {
  console.log("🧹 Starting cleanup...");
  
  const all = await db.categories.toArray();
  const nameCounts = new Map();
  
  for (const cat of all) {
    const name = cat.name?.trim();
    if (!name) continue;
    
    if (!nameCounts.has(name)) {
      nameCounts.set(name, []);
    }
    nameCounts.get(name).push(cat);
  }
  
  for (const [name, cats] of nameCounts.entries()) {
    if (cats.length > 1) {
      console.log(`Found ${cats.length} copies of "${name}"`);
      
      // Keep the first one, delete the rest
      for (let i = 1; i < cats.length; i++) {
        console.log(`Deleting duplicate ID ${cats[i].id}`);
        await db.categories.delete(cats[i].id);
        await db.subcategories.where('catId').equals(cats[i].id).delete();
      }
    }
  }
  
  // Reload state
  state.categories = await db.categories.toArray();
  state.subcategories = await db.subcategories.toArray();
  saveSnapshot();
  
  console.log("✅ Cleanup complete!");
  return await db.categories.toArray();
}