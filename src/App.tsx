function App() {
  console.log("Nouvelle version - App"); // 👈 test
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
    // Update document title and theme
    const title = 'Random Bible - The Voice of God';
    document.title = title;
    
    // Update HTML class for theme
    if (state.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.settings.theme]);

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
    <div className={`min-h-screen transition-colors duration-200 ${
      state.settings.theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <Navigation />
      <main>
        {renderCurrentPage()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
