const CACHE = 'todo-v1';
const SHELL = ['./', './manifest.json', './icon-192.png', './icon-512.png'];

/* Install: cache app shell */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

/* Activate: remove old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Fetch strategy:
   - Supabase API calls: network-first (always try live, fall back to nothing)
   - Google Fonts / CDN scripts: network-first with cache fallback
   - App shell: cache-first
*/
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase: always network, no cache
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Everything else: cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET responses from CDNs / same origin
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => cached); // offline fallback
    })
  );
});
