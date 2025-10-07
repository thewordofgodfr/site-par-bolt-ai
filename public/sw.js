// sw.js — Offline béton SANS bump manuel du cache
const CACHE_NAME = 'twog'; // stable
const APP_SHELL = [
  '/',                // SPA entry
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/site.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    // On garde un seul cache nommé 'twog' : les assets hashés créent de nouvelles clés,
    // et l'index est récupéré réseau en premier (voir plus bas).
    self.clients.claim();
  })());
});

// Helpers
const isStaticAsset = (url) =>
  url.pathname.startsWith('/assets/') ||
  url.pathname.endsWith('.js') ||
  url.pathname.endsWith('.css') ||
  url.pathname.endsWith('.png') ||
  url.pathname.endsWith('.jpg') ||
  url.pathname.endsWith('.jpeg') ||
  url.pathname.endsWith('.svg') ||
  url.pathname.endsWith('.webp');

const isBibleJson = (url) =>
  url.pathname.startsWith('/data/bible/') && url.pathname.endsWith('.json');

// Fetch strategies
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Navigations → network-first avec fallback SPA (offline)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;

        const net = await fetch(req, { cache: 'no-store' });
        // Optionnel: garder la home en cache
        if (url.pathname === '/' && net && net.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('/', net.clone());
        }
        return net;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('/')) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // 2) JSON Bible → stale-while-revalidate (sert cache, met à jour en arrière-plan)
  if (isBibleJson(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchAndUpdate = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => null);

      return cached || (await fetchAndUpdate) || new Response('{"error":"offline"}', {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    })());
    return;
  }

  // 3) Assets statiques (hashés par Vite) → cache-first + update background
  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchAndUpdate = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => null);

      return cached || (await fetchAndUpdate) || new Response('Offline asset', { status: 503 });
    })());
    return;
  }

  // 4) Par défaut → network-first puis fallback cache
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch {
      const cached = await cache.match(req);
      if (cached) return cached;
      if (url.origin === self.location.origin) {
        const home = await cache.match('/');
        if (home) return home;
      }
      return new Response('Offline', { status: 503 });
    }
  })());
});
