// Bump this on every deploy that changes app.js/index.html so old caches get cleared.
const CACHE_NAME = "fin-plan-v6";

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Lets the page ask the waiting worker to activate immediately (see index.html's
// "new version available" prompt) instead of waiting for every tab to close first.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isAppShell = url.origin === self.location.origin;
  // HTML and the app bundle change every time you ship an update — always prefer the
  // network so you're never stuck on a stale copy, but still fall back to cache offline.
  const isCoreFile = isAppShell && (req.mode === "navigate" || url.pathname.endsWith("app.js") || url.pathname.endsWith("/") || url.pathname.endsWith("index.html"));

  if (isCoreFile) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
  } else if (isAppShell) {
    // static assets that don't change often (icons, manifest): cache-first
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
  } else {
    // CDN dependencies: stale-while-revalidate — instant from cache offline,
    // quietly refreshed in the background when online.
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
