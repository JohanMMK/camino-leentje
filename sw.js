// Service Worker voor offline gebruik tijdens de Camino
// Cachet de HTML zodat alles ook zonder internet werkt

const CACHE_NAME = 'camino-leentje-v1';
const URLS_TO_CACHE = [
  './',
  './index.html'
];

// Bij installatie: alles meteen cachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Oude caches opruimen bij activatie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Bij elke aanvraag: eerst cache, dan netwerk (cache-first strategie)
// Voor Maps-links en externe content gewoon naar netwerk proberen
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Externe links (Google Maps, tel:, etc.) → niet onderscheppen
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Geslaagde response toevoegen aan cache voor volgende keer
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline en niet in cache → probeer index.html
        return caches.match('./index.html');
      });
    })
  );
});
