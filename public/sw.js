// sw.js — Offline béton avec pré-cache complet Bible (FR+EN)
const CACHE_NAME = 'twog'; // stable
const APP_SHELL = [
  '/', '/favicon.ico', '/logo192.png', '/logo512.png', '/site.webmanifest'
];

// --- Pré-cache complet ---
const PRECACHE_FULL_BIBLE = true;
const BIBLES_INDEX_URL = '/data/bible/bibles-index.json';
const PRECACHE_CHUNK = 15; // nb de fichiers téléchargés en parallèle

async function precacheBibleFromIndex(cache) {
  try {
    const res = await fetch(BIBLES_INDEX_URL, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[SW] bibles-index.json introuvable ou invalide');
      return;
    }
    const index = await res.json();
    const all = [...(index.fr || []), ...(index.en || [])];

    for (let i = 0; i < all.length; i += PRECACHE_CHUNK) {
      const slice = all.slice(i, i + PRECACHE_CHUNK);
      await Promise.all(slice.map(async (url) => {
        try {
          const r = await fetch(url);
          if (r && (r.ok || r.type === 'opaque')) {
            await cache.put(url, r.clone());
          }
        } catch {
          // on ignore l'erreur pour continuer le lot suivant
        }
      }));
    }
    console.log('[SW] Pré-cache Bible terminé :', all.length, 'fichiers');
  } catch (e) {
    console.warn('[SW] Erreur pré-cache Bible :', e);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    if (PRECACHE_FULL_BIBLE) {
      await precacheBibleFromIndex(cache);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
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

  // 1) Navigations → network-first + fallback SPA (offline)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;

        const net = await fetch(req, { cache: 'no-store' });
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

  // 3) Assets statiques (hashés par Vite) → cache-first + mise à jour en arrière-plan
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
