// Block Time offline cache. Bump VERSION whenever you upload changed files.
const VERSION = 'bt-v36';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png',
  './fonts/b612-latin-400-normal.woff2', './fonts/b612-latin-700-normal.woff2',
  './fonts/b612-mono-latin-400-normal.woff2', './fonts/b612-mono-latin-700-normal.woff2'
];
self.addEventListener('install', e => {
  // Fetch with cache:'reload' so the browser's HTTP cache is bypassed. With a
  // plain addAll() the new worker can cache the PREVIOUS index.html straight
  // out of the HTTP cache (GitHub Pages sends max-age=600), while the worker
  // script itself is always revalidated — so the app reports a new version
  // while still running the old page. That is exactly what happened at bt-v12.
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(
    FILES.map(f => fetch(new Request(f, {cache: 'reload'}))
      .then(r => { if (r.ok || r.type === 'opaque') return c.put(f, r); })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'skipWaiting') self.skipWaiting();
  if (d.type === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage({version: VERSION});
});
// Cache first: the app always opens instantly and fully offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Sync talks to the user's own server: never cache or inspect that traffic.
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
