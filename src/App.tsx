import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Reading from './pages/Reading';
import Search from './pages/Search';
import Settings from './pages/Settings';
import About from './pages/About';

function AppContent() {
  const { state } = useApp();

  // 1) Titre dynamique + thème + attribut lang
  useEffect(() => {
    const { language, theme } = state.settings;

    const titles = {
      fr: {
        home: 'Dieu vous parle – Verset aléatoire',
        reading: 'Lecture',
        search: 'Recherche biblique',
        settings: 'Réglages',
        about: 'À propos',
        fallback: 'TheWordofGod.fr',
      },
      en: {
        home: 'God speaks to you – Random verse',
        reading: 'Reading',
        search: 'Bible Search',
        settings: 'Settings',
        about: 'About',
        fallback: 'TheWordofGod.fr',
      },
    } as const;

    const dict = language === 'fr' ? titles.fr : titles.en;
    const pageKey = (state.currentPage as keyof typeof dict) || 'fallback';
    document.title = dict[pageKey] ?? dict.fallback;

    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    root.setAttribute('lang', language === 'fr' ? 'fr' : 'en');
  }, [state.currentPage, state.settings.language, state.settings.theme]);

  // 2) Mesure en temps réel de la hauteur du <nav> pour éviter tout chevauchement
  const [navH, setNavH] = useState<number>(64);

  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector('nav') as HTMLElement | null;
      if (nav) setNavH(nav.offsetHeight);
    };

    measure(); // première mesure

    // Observe les changements de taille du nav (contenu qui wrappe, etc.)
    const nav = document.querySelector('nav') as HTMLElement | null;
    let ro: ResizeObserver | null = null;
    if (nav && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => measure());
      ro.observe(nav);
    }

    // Recalcule aussi au resize/rotation
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      if (ro && nav) ro.unobserve(nav);
    };
  }, []);

  // Petit ajustement fin : si le contenu est "trop bas", rends ADJUST plus négatif (ex. -8)
  // S'il est "trop haut" (caché sous la nav), rends ADJUST moins négatif (ex. -2 ou 0)
  const ADJUST = -160; // valeur conseillée pour mobile + PC ; ajuste si besoin
  const mainPaddingTop = Math.max(navH + ADJUST, 0);

  const renderCurrentPage = () => {
    switch (state.currentPage) {
      case 'home':
        return <Home />;
      case 'reading':
        return <Reading />;
      case 'search':
        return <Search />;
      case 'settings':
        return <Settings />;
      case 'about':
        return <About />;
      default:
        return <Home />;
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        state.settings.theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      <Navigation />
      {/* Le padding-top s’aligne sur la vraie hauteur du nav (avec micro-ajustement) */}
      <main style={{ paddingTop: `${mainPaddingTop}px` }}>{renderCurrentPage()}</main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

