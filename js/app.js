// app.js (boot, navigation, screen switching)
import { EventBus } from './event-bus.js';
import { loadSnapshot, loadFromDexie, addTransaction, updateTransaction, deleteTransaction, setLastBackup, state } from './state.js';
import { dbExportJSON as dbExport } from './db.js';

const screens = {
  home: document.getElementById('home-screen'),
  stats: document.getElementById('stats-screen'),
  settings: document.getElementById('settings-screen-wrap')
};

const componentsReady = () => {
  // attach event handlers
  EventBus.on('open-entry-sheet', (data) => {
    document.querySelector('entry-sheet').open(data);
  });

  EventBus.on('tx-add', async (tx) => {
    await addTransaction(tx);
  });
  EventBus.on('tx-save', async (tx) => {
    await updateTransaction(tx);
  });
  EventBus.on('tx-delete', async (id) => {
    await deleteTransaction(id);
  });

  EventBus.on('navigate', ({to})=>{
    navigate(to);
  });

  // Settings > Backup export import
  EventBus.on('export-db', async () => {
    const json = await dbExport();
    const blob = new Blob([JSON.stringify(json, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `expense-manager-backup-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastBackup(new Date().toISOString());
  });

  EventBus.on('import-db', async (json) => {
    try {
      await dbImportJSON(json);
      await loadFromDexie();
      alert('Import success');
    } catch (e) {
      alert('Import failed: '+e.message);
    }
  });

  // Auto-backup every 24 hours (also triggered in startup)
  setupAutoBackup();
};

function navigate(to) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  if (to === 'home') screens.home.classList.remove('hidden');
  else if (to === 'stats') screens.stats.classList.remove('hidden');
  else if (to === 'settings') screens.settings.classList.remove('hidden');
  EventBus.emit('navigated', to);
  // show/hide FAB via event
  EventBus.emit('show-fab', to === 'home');
}

async function setupAutoBackup() {
  // 24 * 60 * 60 * 1000 ms
  const DAY = 24 * 60 * 60 * 1000;
  // first attempt immediate backup if none recently
  tryAutoBackup();
  setInterval(tryAutoBackup, DAY);
}

async function tryAutoBackup() {
  try {
    // Attempt File System Access API if available
    const json = await dbExport();
    const data = JSON.stringify(json);
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `expense-backup-${new Date().toISOString().slice(0,10)}.json`,
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        setLastBackup(new Date().toISOString());
        return;
      } catch (e) {
        // user may have cancelled - fallback to download
      }
    }
    // Fallback: force download
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `expense-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
    setLastBackup(new Date().toISOString());
  } catch (e) {
    console.warn('auto backup failed', e);
  }
}

// bootstrap sequence
(async function boot() {
  // 1. load snapshot for fast boot
  await loadSnapshot();

  // 2. mount listeners when components loaded
  document.addEventListener('DOMContentLoaded', () => {
    componentsReady();
    // navigate to home by default
    navigate('home');
  });

  // 3. load real DB
  await loadFromDexie();

  // Try lock logic (simple):
  const settingsPin = await (async ()=>{ try { return (await window.fetch('/fake').catch(()=>null), null); } catch(e){ return null;} })();
  // If PIN set — we expect state.settings.pinEnabled
  if (state.settings?.pinEnabled) {
    EventBus.emit('require-lock');
  } else {
    EventBus.emit('unlock');
  }
})();
