// db.js
import Dexie from 'https://unpkg.com/dexie@3/dist/dexie.mjs';

export const DB = new Dexie('expense_manager_db_v1');

DB.version(1).stores({
  transactions: 'id, date, amount, catId, subId',
  categories: 'id, name, emoji, order',
  subcategories: 'id, catId, name',
  settings: 'key'
});

export async function dbInit() {
  // Ensure default category if none exists
  const cats = await DB.categories.toArray();
  if (cats.length === 0) {
    await DB.categories.bulkAdd([
      { id: 'cat-income', name: 'Income', emoji: '💰', order: 0 },
      { id: 'cat-food', name: 'Food', emoji: '🍔', order: 1 },
      { id: 'cat-transport', name: 'Transport', emoji: '🚗', order: 2 }
    ]);
  }
}

export async function dbExportJSON() {
  const [transactions, categories, subcategories, settings] = await Promise.all([
    DB.transactions.toArray(), DB.categories.toArray(), DB.subcategories.toArray(), DB.settings.toArray()
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), transactions, categories, subcategories, settings };
}

export async function dbImportJSON(json) {
  if (!json) throw new Error('Invalid import');
  await DB.transaction('rw', DB.transactions, DB.categories, DB.subcategories, DB.settings, async () => {
    if (json.transactions) await DB.transactions.clear().then(()=>DB.transactions.bulkAdd(json.transactions));
    if (json.categories) await DB.categories.clear().then(()=>DB.categories.bulkAdd(json.categories));
    if (json.subcategories) await DB.subcategories.clear().then(()=>DB.subcategories.bulkAdd(json.subcategories));
    if (json.settings) await DB.settings.clear().then(()=>DB.settings.bulkAdd(json.settings));
  });
}
