// /js/db.js
import Dexie from "https://cdn.jsdelivr.net/npm/dexie@3.2.2/dist/dexie.mjs";

export const db = new Dexie("expense_manager");

db.version(1).stores({
  transactions: "++id, amount, date, catId, subId, note",
  categories: "++id, name, icon",
  subcategories: "++id, catId, name",
  settings: "key,value"
});

// Export JSON backup
export async function dbExportJSON() {
  const data = {
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
  a.download = "expense_backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

// Import JSON backup
export async function dbImportJSON(json) {
  await db.transactions.clear();
  await db.categories.clear();
  await db.subcategories.clear();
  await db.settings.clear();

  await db.transactions.bulkAdd(json.transactions || []);
  await db.categories.bulkAdd(json.categories || []);
  await db.subcategories.bulkAdd(json.subcategories || []);
  await db.settings.bulkAdd(json.settings || []);
}
