// sw.js — HTTPS + cache propre + pré-cache Bible
const CACHE_VERSION = 'v5';                 // ← incrémente à chaque déploiement
const CACHE_NAME = `twog-${CACHE_VERSION}`;
const APP_SHELL = ['/', '/favicon.ico', '/logo192.png', '/logo512.png', '/site.webmanifest'];

const BIBLES_INDEX_URL = '/data/bible/bibles-index.json';
const PRECACHE_FULL_BIBLE = true;
const PRECACHE_CHUNK = 15;

const ORIGIN = self.location.origin;
const toHttps = (u) => (typeof u === 'string' && u.startsWith('http://')) ? ('https://' + u.slice(7)) : u;
const normalizeUrl = (u) => {
  if (typeof u !== 'string') return u;
  u = toHttps(u);
  try {
    const abs = new URL(u, ORIGIN);
    // Si l’URL vise theword.fr ou thewordofgod.fr, on la ramène au chemin local
    if (abs.hostname.endsWith('theword.fr') || abs.hostname.endsWith('thewordofgod.fr')) {
      return abs.pathname + abs.search; // même origine
    }
    return abs.href;
  } catch { return u; }
};

async function precacheBibleFromIndex(cache) {
  try {
    const res = await fetch(BIBLES_INDEX_URL, { cache: 'no-store' });
    if (!res.ok) { console.warn('[SW] bibles-index.json introuvable'); return; }
    const idx = await res.json();
    const list = [...(idx.fr || []), ...(idx.en || [])].map(normalizeUrl);

    for (let i = 0; i < list.length; i += PRECACHE_CHUNK) {
      const slice = list.slice(i, i + PRECACHE_CHUNK);
      await Promise.all(slice.map(async (u) => {
        try {
          const req = new Request(u, { cache: 'no-store' });
          const r = await fetch(req);
          if (r && (r.ok || r.type === 'opaque')) await cache.put(req, r.clone());
        } catch {}
      }));
    }
    console.log('[SW] Pré-cache Bible terminé :', list.length, 'fichiers');
  } catch (e) { console.warn('[SW] Erreur pré-cache Bible :', e); }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    if (PRECACHE_FULL_BIBLE) await precacheBibleFromIndex(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // purge anciens caches
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    if ('navigationPreload' in self.registration) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

// Helpers
const isStaticAsset = (url) =>
  url.pathname.startsWith('/assets/') ||
  url.pathname.endsWith('.js') || url.pathname.endsWith('.css') ||
  url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') ||
  url.pathname.endsWith('.jpeg') || url.pathname.endsWith('.svg') ||
  url.pathname.endsWith('.webp');

const isBibleJson = (url) =>
  url.pathname.startsWith('/data/bible/') && url.pathname.endsWith('.json');

// Fetch strategies
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const href = normalizeUrl(url.href);
  const normReq = (href === url.href)
    ? req
    : new Request(href, { headers: req.headers, credentials: req.credentials, mode: req.mode, cache: 'no-store' });

  // 1) Navigations → network-first
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse; if (preload) return preload;
        const net = await fetch(normReq, { cache: 'no-store' });
        if (url.pathname === '/' && net && net.ok) (await caches.open(CACHE_NAME)).put('/', net.clone());
        return net;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('/')) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // 2) JSON Bible → stale-while-revalidate mais réseau forcé
  if (isBibleJson(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(normReq);
      const fetchAndUpdate = fetch(normReq, { cache: 'no-store' })
        .then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(normReq, res.clone()); return res; })
        .catch(() => null);
      return cached || (await fetchAndUpdate) || new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
    })());
    return;
  }

  // 3) Assets statiques → cache-first
  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(normReq);
      const fetchAndUpdate = fetch(normReq, { cache: 'no-store' })
        .then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(normReq, res.clone()); return res; })
        .catch(() => null);
      return cached || (await fetchAndUpdate) || new Response('Offline asset', { status: 503 });
    })());
    return;
  }

  // 4) Par défaut
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const res = await fetch(normReq, { cache: 'no-store' });
      if (res && (res.ok || res.type === 'opaque')) cache.put(normReq, res.clone());
      return res;
    } catch {
      const cached = await cache.match(normReq);
      if (cached) return cached;
      if (url.origin === self.location.origin) {
        const home = await cache.match('/'); if (home) return home;
      }
      return new Response('Offline', { status: 503 });
    }
  })());
});

