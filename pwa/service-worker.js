// Basic service worker - cache assets and support offline
const CACHE = 'em-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/utils.js',
  '/js/event-bus.js',
  '/js/db.js',
  '/js/state.js',
  '/js/worker-stats.js',
  '/components/entry-sheet.js',
  '/components/category-picker.js',
  '/components/tx-item.js',
  '/components/tx-list.js',
  '/components/stats-view.js',
  '/components/settings-screen.js',
  '/components/lock-screen.js',
  '/components/pin-screen.js',
  '/components/tab-bar.js',
  '/pwa/manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // stale-while-revalidate
  e.respondWith(caches.match(e.request).then(cached => {
    const fetchP = fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy));
      }
      return res;
    }).catch(()=> cached || new Response('', {status: 504}));
    return cached || fetchP;
  }));
});
