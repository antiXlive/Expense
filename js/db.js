// /js/db.js
import Dexie from "https://cdn.jsdelivr.net/npm/dexie@3.2.2/dist/dexie.mjs";

export const db = new Dexie("expense_manager");
window.db = db;

// Version 1: Initial schema (keep for migration compatibility)
db.version(1).stores({
  transactions: "++id, amount, date, catId, subId, note",
  categories: "++id, name, emoji, subcategories",
  subcategories: "++id, catId, name",
  settings: "key,value"
});

// Version 2: Optimized with strategic indexes
db.version(2).stores({
  // Transactions: Multi-column indexes for common queries
  // [date+catId] = fast monthly category filtering
  // [date+subId] = fast monthly subcategory filtering
  transactions: "++id, date, catId, subId, amount, [date+catId], [date+subId]",
  
  // Categories: indexed by name for quick lookups
  categories: "++id, name, emoji",
  
  // Subcategories: indexed by catId for fast parent-child queries
  subcategories: "++id, catId, name",
  
  // Settings: key as primary index
  settings: "key"
});

// ============================================
// OPTIMIZED QUERY FUNCTIONS
// ============================================

/**
 * Get transactions for a specific month
 * @param {string} yearMonth - Format: "2025-01"
 * @returns {Promise<Array>} Filtered transactions
 */
export async function getTransactionsByMonth(yearMonth) {
  const [year, month] = yearMonth.split('-');
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-31`; // Simplified, works for all months
  
  return await db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
}

/**
 * Get transactions for a specific category in a date range
 * @param {number} catId - Category ID
 * @param {string} startDate - Format: "2025-01-01"
 * @param {string} endDate - Format: "2025-01-31"
 * @returns {Promise<Array>}
 */
export async function getTransactionsByCategoryAndDate(catId, startDate, endDate) {
  return await db.transactions
    .where('[date+catId]')
    .between([startDate, catId], [endDate, catId], true, true)
    .toArray();
}

/**
 * Get transactions for a specific subcategory in a date range
 * @param {number} subId - Subcategory ID
 * @param {string} startDate - Format: "2025-01-01"
 * @param {string} endDate - Format: "2025-01-31"
 * @returns {Promise<Array>}
 */
export async function getTransactionsBySubcategoryAndDate(subId, startDate, endDate) {
  return await db.transactions
    .where('[date+subId]')
    .between([startDate, subId], [endDate, subId], true, true)
    .toArray();
}

/**
 * Get all subcategories for a specific category
 * @param {number} catId - Category ID
 * @returns {Promise<Array>}
 */
export async function getSubcategoriesByCategory(catId) {
  return await db.subcategories
    .where('catId')
    .equals(catId)
    .toArray();
}

/**
 * Get transactions in a date range (for stats/reports)
 * @param {string} startDate - Format: "2025-01-01"
 * @param {string} endDate - Format: "2025-12-31"
 * @returns {Promise<Array>}
 */
export async function getTransactionsByDateRange(startDate, endDate) {
  return await db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
}

// ============================================
// BACKUP & RESTORE
// ============================================

/**
 * Export database as JSON backup
 */
export async function dbExportJSON() {
  const data = {
    version: 2, // Track schema version in backup
    exportDate: new Date().toISOString(),
    transactions: await db.transactions.toArray(),
    categories: await db.categories.toArray(),
    subcategories: await db.subcategories.toArray(),
    settings: await db.settings.toArray()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expense_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import JSON backup (with validation)
 * @param {Object} json - Backup data object
 * @throws {Error} If backup is invalid
 */
export async function dbImportJSON(json) {
  // Validate backup structure
  if (!json.transactions || !json.categories) {
    throw new Error("Invalid backup file: missing required data");
  }

  // Clear existing data
  await db.transaction('rw', db.transactions, db.categories, db.subcategories, db.settings, async () => {
    await db.transactions.clear();
    await db.categories.clear();
    await db.subcategories.clear();
    await db.settings.clear();

    // Import data in order (respecting foreign keys)
    await db.categories.bulkAdd(json.categories);
    await db.subcategories.bulkAdd(json.subcategories || []);
    await db.transactions.bulkAdd(json.transactions);
    await db.settings.bulkAdd(json.settings || []);
  });
}

// ============================================
// DATABASE UTILITIES
// ============================================

/**
 * Get database statistics
 * @returns {Promise<Object>} Database stats
 */
export async function getDBStats() {
  const [txCount, catCount, subCount] = await Promise.all([
    db.transactions.count(),
    db.categories.count(),
    db.subcategories.count()
  ]);

  return {
    transactions: txCount,
    categories: catCount,
    subcategories: subCount,
    version: db.verno
  };
}

/**
 * Clear all data (for testing or reset)
 * @returns {Promise<void>}
 */
export async function clearAllData() {
  await db.transaction('rw', db.transactions, db.categories, db.subcategories, db.settings, async () => {
    await db.transactions.clear();
    await db.categories.clear();
    await db.subcategories.clear();
    await db.settings.clear();
  });
}