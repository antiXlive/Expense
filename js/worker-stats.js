// worker-stats.js
// This file will be imported as a Worker where needed.
// NOTE: When creating a Worker from module, the main thread will use: new Worker('/js/worker-stats.js', { type: 'module' })

self.addEventListener('message', (e) => {
  const { cmd, payload } = e.data;
  if (cmd === 'compute') {
    const tx = payload || [];
    const perCat = {};
    let monthly = {};
    for (const t of tx) {
      const cat = t.catId || 'uncategorized';
      perCat[cat] = (perCat[cat] || 0) + (Number(t.amount) || 0);
      const m = (new Date(t.date)).toISOString().slice(0,7);
      monthly[m] = (monthly[m] || 0) + (Number(t.amount) || 0);
    }
    const result = { perCat, monthly, total: tx.reduce((a,b)=>a+Number(b.amount||0),0) };
    self.postMessage({ cmd:'result', result });
  }
});
