// Service Worker voor offline gebruik tijdens de Camino
// v2: voegt route-waypoints, find-feature, en Leaflet toe

const CACHE_NAME = 'camino-leentje-v2';
const URLS_TO_CACHE = [
  './',
  './index.html'
];

// Bij installatie: alles cachen en oude vervangen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Oude caches opruimen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first voor eigen domein, netwerk-with-cache voor Leaflet CDN
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Leaflet CDN -> stale-while-revalidate (cache als beschikbaar, anders fetch + cache)
  if (url.hostname === 'unpkg.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // OSM tiles → laat door, niet onderscheppen (te veel data om te cachen)
  if (url.hostname.includes('tile.openstreetmap.org')) return;

  // Andere externe links → niet onderscheppen
  if (url.origin !== self.location.origin) return;

  // Eigen domein: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
