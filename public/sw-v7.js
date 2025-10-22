// sw-v7.js — prod: https+cache propre+MAJ immédiate + fallback navigation robuste + precache assets index
const CACHE_VERSION = 'v11';
const CACHE_NAME = `twog-${CACHE_VERSION}`;
const APP_SHELL = ['/', '/index.html', '/favicon.ico', '/logo192.png', '/logo512.png', '/site.webmanifest'];

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

// --- helpers pour fallback app-shell ---
async function getAppShellFromCache(cache) {
  // ignoreSearch couvre '/', '/?x=y' etc., puis fallback '/index.html'
  return (await cache.match('/', { ignoreSearch: true })) ||
         (await cache.match('/index.html', { ignoreSearch: true }));
}

// --- precache des assets référencés par index.html ---
async function precacheAppShellAssets(cache) {
  try {
    // On récupère l'index sans utiliser le cache HTTP
    const res = await fetch('/index.html', { cache: 'no-store' });
    if (!res || !res.ok) return;

    // On met la version fraîche d'index.html dans notre cache
    await cache.put('/index.html', res.clone());

    const html = await res.text();

    // Récupère toutes les URLs src/href de <script> et <link>
    const urls = new Set();
    const rx = /<(?:script|link)\b[^>]+?(?:src|href)=["']([^"']+)["']/gi;
    let m;
    while ((m = rx.exec(html)) !== null) {
      const raw = m[1];
      try {
        const abs = new URL(raw, ORIGIN);
        // On ne garde que même origine
        if (abs.origin === ORIGIN) {
          urls.add(abs.pathname + abs.search);
        }
      } catch {}
    }

    // Filtre aux assets utiles pour un reload offline (hashés Vite)
    const toCache = [...urls].filter(u =>
      u.startsWith('/assets/') ||
      u.endsWith('.js') || u.endsWith('.css') ||
      u.endsWith('.woff2') || u.endsWith('.woff') ||
      u.endsWith('.ttf') || u.endsWith('.eot') ||
      u.endsWith('.svg') || u.endsWith('.png') ||
      u.endsWith('.jpg') || u.endsWith('.jpeg') ||
      u.endsWith('.webp')
    );

    // Télécharge et stocke chaque asset
    await Promise.all(toCache.map(async (u) => {
      try {
        const req = new Request(u, { cache: 'no-store' });
        const r = await fetch(req);
        if (r && (r.ok || r.type === 'opaque')) {
          await cache.put(req, r.clone());
        }
      } catch {}
    }));
  } catch {}
}

async function precacheBibleFromIndex(cache) {
  try {
    const res = await fetch(BIBLES_INDEX_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const idx = await res.json();
    // Multi-langues : précache toutes les entrées présentes dans l'index
    const list = Object.values(idx).flat().map(normalizeUrl);
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
    // 1) App shell de base
    await cache.addAll(APP_SHELL);
    // 2) Index + assets référencés (JS/CSS/fonts/images) pour un reload offline fiable
    await precacheAppShellAssets(cache);
    // 3) Bibles (FR/EN/…)
    if (PRECACHE_FULL_BIBLE) await precacheBibleFromIndex(cache);
    // Activation immédiate
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
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
  url.pathname.endsWith('.webp') || url.pathname.endsWith('.woff2') ||
  url.pathname.endsWith('.woff') || url.pathname.endsWith('.ttf') ||
  url.pathname.endsWith('.eot');

const isBibleJson = (url) =>
  url.pathname.startsWith('/data/bible/') &&
  (url.pathname.endsWith('.json') || url.pathname.endsWith('.jsonl'));

// Strategies
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const href = normalizeUrl(url.href);
  const normReq = (href === url.href)
    ? req
    : new Request(href, { headers: req.headers, credentials: req.credentials, mode: req.mode, cache: 'no-store' });

  // Navigations → network-first (fallback app-shell même avec ?query)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse; if (preload) return preload;
        const net = await fetch(normReq, { cache: 'no-store' });
        return net;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const shell = await getAppShellFromCache(cache);
        return shell || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // JSON/JSONL Bible → stale-while-revalidate (réseau forcé)
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

  // Par défaut → network-first puis cache (fallback app-shell si même origine)
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
        const shell = await getAppShellFromCache(cache);
        if (shell) return shell;
      }
      return new Response('Offline', { status: 503 });
    }
  })());
});


