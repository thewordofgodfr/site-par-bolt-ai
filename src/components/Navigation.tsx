import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import {
  Home,
  Search as SearchIcon,
  BookOpen,
  Settings,
  Info,
} from 'lucide-react';

export default function Navigation() {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const isDark = state.settings.theme === 'dark';

  // Ordre demandé : Accueil → Recherche (loupe) → Lecture → Paramètres → À propos
  const navItems = [
    { id: 'home', icon: Home, label: t('home') },
    { id: 'search', icon: SearchIcon, label: t('search') },
    { id: 'reading', icon: BookOpen, label: t('reading') },
    { id: 'settings', icon: Settings, label: t('settings') },
    { id: 'about', icon: Info, label: t('about') },
  ] as const;

  const baseBtn =
    'transition-all duration-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
  const activeBtn = isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700';
  // 👉 Texte des items inactifs en dark : blanc quasi-plein
  const idleBtn = isDark
    ? 'text-white/90 hover:bg-gray-700 hover:text-white'
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';

  return (
    <nav
      className={[
        'sticky top-0 z-40',
        isDark ? 'bg-gray-800/95' : 'bg-white/95',
        'backdrop-blur',
        isDark ? 'border-b border-gray-700 shadow-sm' : 'border-b border-gray-200 shadow-sm',
        'transition-colors duration-200',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Barre unique responsive */}
        <div className="flex items-center justify-between h-16">
          <div className="flex flex-1 justify-around md:justify-center md:space-x-2">
            {navItems.map(({ id, icon: Icon, label }) => {
              const active = state.currentPage === id;
              return (
                <button
                  key={id}
                  onClick={() => dispatch({ type: 'SET_PAGE', payload: id as any })}
                  aria-current={active ? 'page' : undefined}
                  title={label}
                  className={[
                    baseBtn,
                    'px-3 py-2',
                    'flex flex-col md:flex-row items-center md:space-x-2',
                    active ? activeBtn : idleBtn,
                  ].join(' ')}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="text-[11px] md:text-sm md:leading-none">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
