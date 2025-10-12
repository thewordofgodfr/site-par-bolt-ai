import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// --- PWA: Service Worker pour offline robuste ---
if ('serviceWorker' in navigator) {
  // Enregistre le SW quand tout est chargé
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Enregistré avec succès:', registration.scope);

        // (Optionnel) Suivi des mises à jour du SW
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              // Si une ancienne version existe, une mise à jour est prête
              if (navigator.serviceWorker.controller) {
                console.log('[SW] Nouvelle version prête (actualiser pour charger la mise à jour).');
              } else {
                console.log('[SW] Contenu disponible hors ligne.');
              }
            }
          });
        });
      })
      .catch((err) => {
        console.error('[SW] Échec de l’enregistrement:', err);
      });
  });
}
// Enregistrer le SW avec MAJ immédiate
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-v7.js', { scope: '/' }).then(reg => {
      reg.update(); // vérifie tout de suite s'il y a une nouvelle version

      // Si un SW est en attente, on le fait passer actif
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Quand une nouvelle version est installée, on la prend et on recharge
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    });

    // Quand le contrôleur change → rechargement automatique
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

