// sw-v7.js — prod: https+cache propre+MAJ immédiate
const CACHE_VERSION = 'v8';
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
    if (abs.hostname.endsWith('theword.fr') || abs.hostname.endsWith('thewordofgod.fr')) {
      return abs.pathname + abs.search; // chemin local
    }
    return abs.href;
  } catch { return u; }
};

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'CLEAR_ALL') {
    e.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      self.registration.unregister();
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach(c => c.navigate('/'));
    })());
  }
});

async function precacheBibleFromIndex(cache) {
  try {
    const res = await fetch(BIBLES_INDEX_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const idx = await res.json();
    const list = [...(idx.fr || []), ...(idx.en || [])].map(normalizeUrl);
    for (let i = 0; i < list.length; i += PRECACHE_CHUNK) {
      await Promise.all(list.slice(i, i + PRECACHE_CHUNK).map(async (u) => {
        try {
          const req = new Request(u, { cache: 'no-store' });
          const r = await fetch(req);
          if (r && (r.ok || r.type === 'opaque')) await cache.put(req, r.clone());
        } catch {}
      }));
    }
  } catch {}
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    if (PRECACHE_FULL_BIBLE) await precacheBibleFromIndex(cache);
    await self.skipWaiting(); // prêt à activer tout de suite
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    if ('navigationPreload' in self.registration) await self.registration.navigationPreload.enable();
    await self.clients.claim(); // contrôle immédiat de toutes les pages
  })());
});

// Helpers
const isStaticAsset = (url) =>
  url.pathname.startsWith('/assets/') ||
  url.pathname.endsWith('.js') || url.pathname.endsWith('.css') ||
  url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') ||
  url.pathname.endsWith('.jpeg') || url.pathname.endsWith('.svg') ||
  url.pathname.endsWith('.webp') || url.pathname.endsWith('.woff2');

const isBibleJson = (url) =>
  url.pathname.startsWith('/data/bible/') && url.pathname.endsWith('.json');

// Strategies
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const href = normalizeUrl(url.href);
  const normReq = (href === url.href)
    ? req
    : new Request(href, { headers: req.headers, credentials: req.credentials, mode: req.mode, cache: 'no-store' });

  // Navigations → network-first (fallback cache '/')
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

  // JSON Bible → stale-while-revalidate (réseau forcé)
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

  // Assets statiques → cache-first + MAJ BG
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

  // Par défaut → network-first puis cache
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
