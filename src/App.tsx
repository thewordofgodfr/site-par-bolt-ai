import React, { useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Reading from './pages/Reading';
import Settings from './pages/Settings';
import About from './pages/About';

function AppContent() {
  const { state } = useApp();

  useEffect(() => {
    // Titre selon la langue
    const title =
      state.settings.language === 'fr'
        ? 'Bible Aléatoire - La Parole de Dieu'
        : 'Random Bible - The Voice of God';
    document.title = title;

    // Thème + attribut lang sur <html>
    const root = document.documentElement;
    if (state.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('lang', state.settings.language === 'fr' ? 'fr' : 'en');
  }, [state.settings.theme, state.settings.language]);

  const renderCurrentPage = () => {
    switch (state.currentPage) {
      case 'home':
        return <Home />;
      case 'reading':
        return <Reading />;
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

