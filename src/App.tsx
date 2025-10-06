import React, { useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Reading from './pages/Reading';
import Search from './pages/Search';
import Settings from './pages/Settings';
import About from './pages/About';
import { warmBibleCache } from './services/bibleService';

function AppContent() {
  const { state } = useApp();

  // Pré-chauffage du cache Bible (langue courante + autre langue en tâche de fond)
  useEffect(() => {
    warmBibleCache(state.settings.language);
    const other = state.settings.language === 'fr' ? 'en' : 'fr';
    warmBibleCache(other);
  }, [state.settings.language]);

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

  // Empêche le navigateur de restaurer une ancienne position de scroll
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {}
    }
  }, []);

  // Reviens TJS en haut quand on change de "page" (Home / Search / Reading / Settings / About)
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
