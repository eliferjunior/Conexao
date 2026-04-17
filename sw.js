// Konektra service worker — offline-first shell, network-first for HTML.
const CACHE = 'konektra-v1';
const SHELL = [
  './',
  './index.html',
  './login.html',
  './register.html',
  './dashboard.html',
  './search.html',
  './urgent.html',
  './subscription.html',
  './profile.html',
  './chat.html',
  './faq.html',
  './404.html',
  './tests.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/auth.js',
  './js/crypto.js',
  './js/db.js',
  './js/geo.js',
  './js/seed.js',
  './js/ui.js',
  './assets/logo.svg',
  './assets/favicon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML){
    // network-first for navigations so users get the latest page when online,
    // and a cached fallback (or 404 page) when offline.
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(req).then(cached => cached || caches.match('./404.html'))
      )
    );
    return;
  }

  // cache-first for static assets
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.status === 200){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => cached))
  );
});
