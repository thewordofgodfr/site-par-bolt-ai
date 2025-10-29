import React, { useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Reading from './pages/Reading';
import Search from './pages/Search';
import Settings from './pages/Settings';
import About from './pages/About';
import { warmBibleCache, pauseWarmup, resumeWarmup } from './services/bibleService';

function AppContent() {
  const { state } = useApp();

  // Pré-chauffage (léger) + autre langue en tâche de fond
  useEffect(() => {
    warmBibleCache(state.settings.language, {
      batchSize: 6,
      maxBooks: 66,
      presearchDelayMs: 3000,
      presearchMaxTerms: 3,
    });
    const other = state.settings.language === 'fr' ? 'en' : 'fr';
    warmBibleCache(other, {
      batchSize: 6,
      maxBooks: 66,
      presearchDelayMs: 5000,
      presearchMaxTerms: 2,
    });
  }, [state.settings.language]);

  // Met en pause le warm-up dès qu’on quitte l’accueil (clics menus + réactifs)
  useEffect(() => {
    if (state.currentPage === 'home') {
      resumeWarmup();
    } else {
      pauseWarmup();
    }
  }, [state.currentPage]);

  // Titre dynamique + thème + attribut lang
  useEffect(() => {
    const { language, theme } = state.settings;

    const titles = {
      fr: {
        home: 'Dieu vous parle – Verset aléatoire',
        reading: 'Lecture',
        search: 'Recherche biblique',
        settings: 'Réglages',
        about: 'À propos',
        fallback: 'TheWord.fr',
      },
      en: {
        home: 'God speaks to you – Random verse',
        reading: 'Reading',
        search: 'Bible Search',
        settings: 'Settings',
        about: 'About',
        fallback: 'TheWord.fr',
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

  // Empêche le navigateur de restaurer une ancienne position de scroll
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {}
    }
  }, []);

  // Reviens toujours en haut quand on change de page
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 });
    });
    return () => cancelAnimationFrame(raf);
  }, [state.currentPage]);

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
      {/* Pas de padding-top artificiel : la nav en sticky reste dans le flux */}
      <main>{renderCurrentPage()}</main>
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

