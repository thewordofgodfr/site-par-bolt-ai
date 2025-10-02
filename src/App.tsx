import React, { useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Reading from './pages/Reading';
import Settings from './pages/Settings';
import About from './pages/About';
import Search from './pages/Search'; // <-- nouvelle page

function AppContent() {
  const { state } = useApp();

  // Titre de la page selon page courante + langue
  useEffect(() => {
    const isFR = state.settings.language === 'fr';

    const titles = {
      home: isFR ? 'Accueil – La Parole de Dieu' : 'Home – The Word of God',
      reading: isFR ? 'Lecture – La Parole de Dieu' : 'Reading – The Word of God',
      search: isFR ? 'Recherche – La Parole de Dieu' : 'Search – The Word of God',
      settings: isFR ? 'Paramètres – La Parole de Dieu' : 'Settings – The Word of God',
      about: isFR ? 'À propos – La Parole de Dieu' : 'About – The Word of God',
      fallback: isFR ? 'Bible Aléatoire – La Parole de Dieu' : 'Random Bible – The Voice of God',
    } as const;

    const title =
      titles[(state.currentPage as keyof typeof titles)] ?? titles.fallback;

    document.title = title;

    // Thème + attribut lang sur <html>
    const root = document.documentElement;
    if (state.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('lang', isFR ? 'fr' : 'en');
  }, [state.currentPage, state.settings.theme, state.settings.language]);

  const renderCurrentPage = () => {
    switch (state.currentPage) {
      case 'home':
        return <Home />;
      case 'reading':
        return <Reading />;
      case 'search':            // <-- nouvelle route
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

