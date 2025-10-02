import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { Home, BookOpen, Settings, Info, Globe } from 'lucide-react';

export default function Navigation() {
  const { state, dispatch, updateSettings } = useApp();
  const { t } = useTranslation();

  const navItems = [
    { id: 'home', icon: Home, label: t('home') },
    { id: 'reading', icon: BookOpen, label: t('reading') },
    { id: 'settings', icon: Settings, label: t('settings') },
    { id: 'about', icon: Info, label: t('about') },
  ];

  const toggleLanguage = () => {
    const newLanguage = state.settings.language === 'fr' ? 'en' : 'fr';
    updateSettings({ language: newLanguage });
  };

  const isDark = state.settings.theme === 'dark';

  return (
    <nav
      className={[
        // Collant en haut partout
        'sticky top-0 z-40', // <- était z-50 : on met z-40 pour que l’overlay Livres (z-50) passe au-dessus
        // Fond + flou pour lisibilité quand on scroll
        isDark ? 'bg-gray-800/95' : 'bg-white/95',
        'backdrop-blur',
        // Bordure + ombre légère
        isDark ? 'border-b border-gray-700 shadow-sm' : 'border-b border-gray-200 shadow-sm',
        // Transition douce si on change de thème
        'transition-colors duration-200',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bandeau principal */}
        <div className="flex justify-between items-center h-16">
          {/* Logo cliquable (ramène à Accueil) */}
          <button
            onClick={() => dispatch({ type: 'SET_PAGE', payload: 'home' })}
            className="flex items-center space-x-2 focus:outline-none"
            aria-label="Accueil"
            title="Accueil"
          >
            <BookOpen className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              TheWordofGod.fr
            </span>
          </button>

          {/* Navigation Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(({ id, icon: Icon, label }) => {
              const active = state.currentPage === id;
              return (
                <button
                  key={id}
                  onClick={() => dispatch({ type: 'SET_PAGE', payload: id })}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200',
                    active
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700'
                      : isDark
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  ].join(' ')}
                  title={label}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              );
            })}

            {/* Sélecteur de langue */}
            <button
              onClick={toggleLanguage}
              className={[
                'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200',
                isDark
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              ].join(' ')}
              aria-label="Changer la langue"
              title="Changer la langue"
            >
              <Globe size={20} />
              <span>{state.settings.language.toUpperCase()}</span>
            </button>
          </div>

          {/* Sélecteur de langue (mobile) */}
          <button
            onClick={toggleLanguage}
            className={[
              'md:hidden flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200',
              isDark
                ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            ].join(' ')}
            aria-label="Changer la langue"
            title="Changer la langue"
          >
            <Globe size={20} />
            <span>{state.settings.language.toUpperCase()}</span>
          </button>
        </div>

        {/* Barre de nav Mobile (sous le bandeau) */}
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-around py-2">
            {navItems.map(({ id, icon: Icon, label }) => {
              const active = state.currentPage === id;
              return (
                <button
                  key={id}
                  onClick={() => dispatch({ type: 'SET_PAGE', payload: id })}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200',
                    active
                      ? isDark
                        ? 'text-blue-400'
                        : 'text-blue-600'
                      : isDark
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                  title={label}
                >
                  <Icon size={20} />
                  <span className="text-xs">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

