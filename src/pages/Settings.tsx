import QuickSlotsHelp from '../components/QuickSlotsHelp';
import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { Sun, Moon, Type, Globe, Palette } from 'lucide-react';

export default function Settings() {
  const { state, updateSettings } = useApp();
  const { t } = useTranslation();

  const isDark = state.settings.theme === 'dark';

  // 4 réglages : 18, 20, 22, 24 px
  const fontSizes = [
    { label: '18px', value: 18 },
    { label: '20px', value: 20 },
    { label: '22px', value: 22 },
    { label: '24px', value: 24 },
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {t('settings')}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Appearance Settings */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <Palette size={24} className="mr-3" />
                {t('appearance')}
              </h2>

              {/* Theme Toggle */}
              <div className="mb-8">
                <label className={`block text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  {state.settings.language === 'fr' ? "Mode d'affichage" : 'Display mode'}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => updateSettings({ theme: 'light' })}
                    className={`flex items-center justify-center space-x-3 px-4 py-6 rounded-xl border-2 transition-all duration-200 ${
                      state.settings.theme === 'light'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : isDark
                        ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                        : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <Sun size={24} />
                    <span className="font-medium">{t('lightMode')}</span>
                  </button>
                  <button
                    onClick={() => updateSettings({ theme: 'dark' })}
                    className={`flex items-center justify-center space-x-3 px-4 py-6 rounded-xl border-2 transition-all duration-200 ${
                      state.settings.theme === 'dark'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : isDark
                        ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                        : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <Moon size={24} />
                    <span className="font-medium">{t('darkMode')}</span>
                  </button>
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className={`block text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-700'} flex items-center`}>
                  <Type size={16} className="mr-2" />
                  {t('fontSize')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {fontSizes.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => updateSettings({ fontSize: value })}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all duration-200 ${
                        state.settings.fontSize === value
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : isDark
                          ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                          : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Font Size Preview */}
                <div className={`mt-4 p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg`}>
                  <p
                    className={`${isDark ? 'text-white' : 'text-gray-700'}`}
                    style={{ fontSize: `${state.settings.fontSize}px` }}
                  >
                    {state.settings.language === 'fr'
                      ? 'Aperçu de la taille de police sélectionnée.'
                      : 'Preview of the selected font size.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <Globe size={24} className="mr-3" />
                {t('language')}
              </h2>

              <div className="space-y-4">
                <button
                  onClick={() => updateSettings({ language: 'fr' })}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                    state.settings.language === 'fr'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : isDark
                      ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                      : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🇫🇷</span>
                    <div className="text-left">
                      <div className="font-semibold">Français</div>
                      <div className={`${isDark ? 'text-white/80' : 'text-gray-600'} text-sm`}>Louis Segond 1910</div>
                    </div>
                  </div>
                  {state.settings.language === 'fr' && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => updateSettings({ language: 'en' })}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                    state.settings.language === 'en'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : isDark
                      ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                      : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🇺🇸</span>
                    <div className="text-left">
                      <div className="font-semibold">English</div>
                      <div className={`${isDark ? 'text-white/80' : 'text-gray-600'} text-sm`}>King James Version</div>
                    </div>
                  </div>
                  {state.settings.language === 'en' && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  )}
                </button>
              </div>

              {/* Language Info */}
              <div className={`mt-6 p-4 ${isDark ? 'bg-gray-700' : 'bg-blue-50'} rounded-lg`}>
                <p className={`text-sm ${isDark ? 'text-white/90' : 'text-blue-700'}`}>
                  {state.settings.language === 'fr'
                    ? "La langue est détectée automatiquement selon votre navigateur, mais vous pouvez la changer manuellement."
                    : 'Language is automatically detected based on your browser, but you can change it manually.'}
                </p>
              </div>
            </div>
          </div>

          {/* Aide raccourcis (mise à jour) */}
          <div className="mt-6">
            <QuickSlotsHelp />
          </div>

          {/* Settings Info */}
          <div className={`mt-8 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {state.settings.language === 'fr' ? 'Informations' : 'Information'}
            </h3>
            <p className={`${isDark ? 'text-white/90' : 'text-gray-600'} leading-relaxed`}>
              {state.settings.language === 'fr'
                ? 'Vos paramètres sont automatiquement sauvegardés et seront restaurés lors de votre prochaine visite.'
                : 'Your settings are automatically saved and will be restored on your next visit.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
