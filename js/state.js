// /js/state.js - OPTIMIZED WITH CACHING & ACTIONS
import { db, getTransactionsByMonth, getTransactionsByDateRange } from "./db.js";
import { DEFAULT_CATEGORIES } from "./default-cats.js";
import { EventBus } from "./event-bus.js";

//
// ======================================================
//                GLOBAL APPLICATION STATE
// ======================================================
export const state = {
  tx: [], // Keep full list for backward compatibility
  categories: [],
  subcategories: [],

  settings: {
    autoBackup: false,
    useBiometric: false,
    pin: null,
  },

  lastBackup: 0,
  lastScreen: "home",
};

//
// ======================================================
//                MONTHLY CACHE SYSTEM
// ======================================================
const cache = {
  monthly: {}, // "2025-01": { transactions: [...], loaded: timestamp }
  yearly: {},  // "2025": { transactions: [...], loaded: timestamp }
  categories: null,
  lastFullLoad: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes - cache expires after this

/**
 * Get transactions for a specific month (with caching)
 * @param {string} yearMonth - Format: "2025-01"
 * @returns {Promise<Array>} Cached or fresh transactions
 */
export async function getMonthTransactions(yearMonth) {
  const now = Date.now();
  const cached = cache.monthly[yearMonth];

  // Return cached if valid and fresh
  if (cached && (now - cached.loaded) < CACHE_TTL) {
    console.log(`📦 Using cached data for ${yearMonth}`);
    return cached.transactions;
  }

  // Load from database
  console.log(`🔄 Loading ${yearMonth} from database...`);
  const transactions = await getTransactionsByMonth(yearMonth);
  
  // Enrich transactions with category/subcategory data
  const enriched = transactions.map(enrichTx);

  // Cache the result
  cache.monthly[yearMonth] = {
    transactions: enriched,
    loaded: now
  };

  return enriched;
}

/**
 * Get transactions for a date range (with caching for year)
 * @param {string} startDate - Format: "2025-01-01"
 * @param {string} endDate - Format: "2025-12-31"
 * @returns {Promise<Array>}
 */
export async function getRangeTransactions(startDate, endDate) {
  const year = startDate.substring(0, 4);
  const isFullYear = startDate.endsWith('-01-01') && endDate.endsWith('-12-31');
  
  const now = Date.now();
  const cached = cache.yearly[year];

  // Use cached if it's a full year query and cache is fresh
  if (isFullYear && cached && (now - cached.loaded) < CACHE_TTL) {
    console.log(`📦 Using cached year data for ${year}`);
    return cached.transactions;
  }

  // Load from database
  const transactions = await getTransactionsByDateRange(startDate, endDate);
  const enriched = transactions.map(enrichTx);

  // Cache full year queries
  if (isFullYear) {
    cache.yearly[year] = {
      transactions: enriched,
      loaded: now
    };
  }

  return enriched;
}

/**
 * Invalidate cache for specific month (called on add/edit/delete)
 * @param {string} date - Transaction date "2025-01-15"
 */
function invalidateCache(date) {
  if (!date) return;
  
  const yearMonth = date.substring(0, 7); // "2025-01"
  const year = date.substring(0, 4);      // "2025"
  
  delete cache.monthly[yearMonth];
  delete cache.yearly[year];
  
  console.log(`🗑️ Cache invalidated for ${yearMonth}`);
}

/**
 * Clear all caches
 */
export function clearCache() {
  cache.monthly = {};
  cache.yearly = {};
  cache.categories = null;
  cache.lastFullLoad = 0;
  console.log("🗑️ All caches cleared");
}

//
// ======================================================
//      TRANSACTION ENRICHMENT (Add category info)
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

//
// ======================================================
//          TRANSACTION CRUD ACTIONS
// ======================================================

/**
 * Add a new transaction
 * @param {Object} txData - { amount, date, catId, subId, note }
 * @returns {Promise<number>} New transaction ID
 */
export async function addTransaction(txData) {
  // Enrich before saving
  const tx = enrichTx(txData);
  
  // Save to database
  const id = await db.transactions.add(tx);
  tx.id = id;

  // Update in-memory state
  state.tx.push(tx);
  saveSnapshot();

  // Invalidate cache
  invalidateCache(tx.date);

  // Emit events
  EventBus.emit("tx-added", tx);
  EventBus.emit("tx-updated", tx);
  EventBus.emit("db-loaded", { tx: state.tx });

  console.log(`✅ Transaction added: ID ${id}`);
  return id;
}

/**
 * Update an existing transaction
 * @param {Object} txData - Must include id
 * @returns {Promise<void>}
 */
export async function updateTransaction(txData) {
  const tx = enrichTx(txData);

  // Update database
  await db.transactions.put(tx);

  // Update in-memory state
  const i = state.tx.findIndex(t => t.id === tx.id);
  if (i !== -1) {
    state.tx[i] = tx;
  }
  saveSnapshot();

  // Invalidate cache
  invalidateCache(tx.date);

  // Emit events
  EventBus.emit("tx-updated", tx);
  EventBus.emit("tx-saved", tx);
  EventBus.emit("db-loaded", { tx: state.tx });

  console.log(`✅ Transaction updated: ID ${tx.id}`);
}

/**
 * Delete a transaction
 * @param {number} id - Transaction ID
 * @returns {Promise<void>}
 */
export async function deleteTransaction(id) {
  // Find transaction to get its date for cache invalidation
  const tx = state.tx.find(t => t.id === id);
  
  // Delete from database
  await db.transactions.delete(id);

  // Update in-memory state
  state.tx = state.tx.filter(t => t.id !== id);
  saveSnapshot();

  // Invalidate cache
  if (tx) {
    invalidateCache(tx.date);
  }

  // Emit events
  EventBus.emit("tx-deleted", id);
  EventBus.emit("tx-updated", id);
  EventBus.emit("db-loaded", { tx: state.tx });

  console.log(`✅ Transaction deleted: ID ${id}`);
}

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
    state.lastScreen = ss.lastScreen || "home";

    console.log(`📸 Snapshot loaded: ${state.tx.length} transactions`);
  } catch (e) {
    console.error("Snapshot load error:", e);
  }
}

export function saveSnapshot() {
  try {
    localStorage.setItem(
      "appSnapshot",
      JSON.stringify({
        tx: state.tx,
        categories: state.categories,
        subcategories: state.subcategories,
        settings: state.settings,
        lastBackup: state.lastBackup,
        lastScreen: state.lastScreen,
      })
    );
  } catch (e) {
    console.error("Snapshot save error:", e);
  }
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
    for (const cat of corrupted) {
      await db.categories.delete(cat.id);
      await db.subcategories.where('catId').equals(cat.id).delete();
    }
  }

  // 3️⃣ Check for duplicate category names
  const names = existing
    .filter(c => c.name && c.name.trim())
    .map(c => c.name.trim());
  
  const uniqueNames = new Set(names);
  
  if (names.length !== uniqueNames.size) {
    console.warn("⚠️ Duplicate categories detected, cleaning up...");
    
    const nameCounts = new Map();
    for (const name of names) {
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
    
    const duplicateNames = Array.from(nameCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([name, _]) => name);
    
    for (const dupName of duplicateNames) {
      const cats = await db.categories.where('name').equals(dupName).toArray();
      for (let i = 1; i < cats.length; i++) {
        await db.categories.delete(cats[i].id);
        await db.subcategories.where('catId').equals(cats[i].id).delete();
      }
    }
  }

  // 4️⃣ After cleanup, reload and check if we need defaults
  const cleanedCategories = await db.categories.toArray();
  
  if (cleanedCategories.length === 0) {
    console.log("📌 No categories after cleanup, loading defaults...");
    await loadDefaults();
  }
}

async function loadDefaults() {
  try {
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
      const exists = await db.categories
        .where('name')
        .equals(cat.name)
        .first();
      
      if (exists) {
        console.log(`⏭️ Skipping "${cat.name}" - already exists`);
        continue;
      }

      const catId = await db.categories.add({
        name: cat.name,
        emoji: cat.emoji
      });

      if (cat.subcategories?.length) {
        await db.subcategories.bulkAdd(
          cat.subcategories.map(sub => ({
            catId,
            name: sub.name
          }))
        );
      }
    }
    
    console.log(`✅ Defaults loaded successfully`);
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

  // Load all transactions for backward compatibility
  state.tx = await db.transactions.toArray();
  
  // Enrich them with category data
  state.tx = state.tx.map(enrichTx);

  state.categories = await db.categories.toArray();
  state.subcategories = await db.subcategories.toArray();

  saveSnapshot();
  
  console.log(`✅ Loaded ${state.tx.length} transactions, ${state.categories.length} categories`);
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
    clearCache(); // Categories changed, invalidate all caches
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
  
  state.categories = await db.categories.toArray();
  state.subcategories = await db.subcategories.toArray();
  
  saveSnapshot();
  clearCache();
}

//
// ======================================================
//              CLEANUP UTILITY
// ======================================================
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
      
      for (let i = 1; i < cats.length; i++) {
        console.log(`Deleting duplicate ID ${cats[i].id}`);
        await db.categories.delete(cats[i].id);
        await db.subcategories.where('catId').equals(cats[i].id).delete();
      }
    }
  }
  
  state.categories = await db.categories.toArray();
  state.subcategories = await db.subcategories.toArray();
  saveSnapshot();
  clearCache();
  
  console.log("✅ Cleanup complete!");
  return await db.categories.toArray();
}