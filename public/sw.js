const CACHE = 'manbora-shell-v1';
const SHELL = ['/', '/offline', '/favicon.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || /\/asarlar\/[^/]+\/[^/]+/.test(url.pathname)) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; }).catch(() => caches.match(req).then(r => r || caches.match('/offline'))));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || ['style','script','font','image'].includes(req.destination)) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; })));
  }
});
