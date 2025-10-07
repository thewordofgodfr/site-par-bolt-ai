const CACHE_NAME = 'twog-v1';
const ASSETS = [
  '/',                    // index.html via SPA
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/site.webmanifest',
  // Bundle app (ajoute tes vrais chemins si tu builds en Vite/React)
  '/src/main.tsx',        // ou les fichiers générés dans /assets lors du build
  // JSON essentiels (ajoute ce dont tu as besoin hors-ligne)
  '/data/bible/fr/Genese.json',
  '/data/bible/en/Genesis.json',
  // … ajoute les fichiers clés que tu veux offline (ou un index de tout)
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first pour assets & JSON
self.addEventListener('fetch', (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached => 
      cached || fetch(req).then(res => {
        // Optionnel: mettre en cache à la volée
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match('/')) // fallback à l’index
    )
  );
});
