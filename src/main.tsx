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

// --- PWA: Service Worker (MAJ immédiate, un seul SW: /sw-v7.js) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // 1) Désenregistrer tout ancien SW qui n'est pas /sw-v7.js
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          const scriptURL =
            reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
          if (!scriptURL.endsWith('/sw-v7.js')) {
            await reg.unregister();
          }
        })
      );

      // 2) Enregistrer le nouveau SW
      const reg = await navigator.serviceWorker.register('/sw-v7.js', { scope: '/' });

      // Vérifier tout de suite s'il y a une nouvelle version
      reg.update();

      // Si un SW est déjà prêt en attente, on le promeut
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Quand une nouvelle version est détectée, on la prend
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Quand le contrôleur change → rechargement automatique
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    } catch (err) {
      console.error('[SW] registration error:', err);
    }
  });
}
