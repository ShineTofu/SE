const CACHE_NAME = "daily-se-tool-cache-v1";

// We pre-cache local files. The XLSX CDN is cached at runtime on first load.
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Cache-first for same-origin (your app files)
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Runtime cache for CDN too (first online load -> available offline after)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        // Only cache successful GET responses
        if (req.method === "GET" && res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => {
        // If offline and no cache: fallback to app shell if navigating
        if (req.mode === "navigate") {
          return caches.match("./index.html");
        }
        return cached;
      });
    })
  );
});
