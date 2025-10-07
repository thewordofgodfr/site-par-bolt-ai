// sw.js — PWA offline "béton" pour Vite/React + JSON Bible
const CACHE_NAME = 'twog-v2'; // <-- Incrémente à chaque déploiement
const APP_SHELL = [
  '/',                // SPA entry
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/site.webmanifest'
];

// Active la navigation preload si supportée (accélère la 1re réponse)
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    // Clean des anciens caches
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    );
    self.clients.claim();
  })());
});

// Pré-cache du shell de l'app
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // Force l’activation immédiate du nouveau SW
    await self.skipWaiting();
  })());
});

// Helper: décide si c’est une requête d’asset statique
const isStaticAsset = (url) => {
  // Vite met souvent JS/CSS/images dans /assets/ avec hash
  return url.pathname.startsWith('/assets/')
      || url.pathname.endsWith('.js')
      || url.pathname.endsWith('.css')
      || url.pathname.endsWith('.png')
      || url.pathname.endsWith('.jpg')
      || url.pathname.endsWith('.jpeg')
      || url.pathname.endsWith('.svg')
      || url.pathname.endsWith('.webp');
};

// Helper: JSON de la Bible (cache-first)
const isBibleJson = (url) => {
  return url.pathname.startsWith('/data/bible/')
      && url.pathname.endsWith('.json');
};

// Routeur de stratégies de cache
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // On ne gère que les GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Navigation (pages) → fallback SPA sur index.html
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Utilise la navigation preload si dispo
        const preload = await event.preloadResponse;
        if (preload) return preload;

        // Tente le réseau d’abord
        const netRes = await fetch(req);
        // On met en cache la réponse d’index.html si c’est la home
        if (url.pathname === '/' && netRes && netRes.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('/', netRes.clone());
        }
        return netRes;
      } catch {
        // Hors-ligne → renvoie l’index du shell
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('/');
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // 2) JSON Bible → cache-first (offline parfait)
  if (isBibleJson(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        // Cache uniquement si OK (ou opaque si tu veux)
        if (res && (res.ok || res.type === 'opaque')) {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        // Pas de réseau et pas en cache
        return new Response('{"error":"offline"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // 3) Assets statiques → cache-first + mise à jour en arrière-plan
  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchAndUpdate = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          cache.put(req, res.clone());
        }
        return res;
      }).catch(() => null);

      // Servez le cache si dispo, sinon réseau
      return cached || (await fetchAndUpdate) || new Response('Offline asset', { status: 503 });
    })());
    return;
  }

  // 4) Par défaut → network-first puis fallback cache
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      const cached = await cache.match(req);
      if (cached) return cached;
      // Dernier recours si c’est une ressource même-origine
      if (url.origin === self.location.origin) {
        const home = await cache.match('/');
        if (home) return home;
      }
      return new Response('Offline', { status: 503 });
    }
  })());
});

