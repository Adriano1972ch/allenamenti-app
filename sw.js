const CACHE_NAME = "training-app-v5";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first per asset principali, così gli aggiornamenti arrivano subito.
// Fallback a cache se offline.
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  const isAppShell =
    url.origin === self.location.origin &&
    (url.pathname.endsWith("/app.js") ||
     url.pathname.endsWith("/style.css") ||
     url.pathname.endsWith("/index.html") ||
     url.pathname.endsWith("/"));

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Default: cache-first (come prima)
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
