import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Search } from 'lucide-react';

export default function QuickSlotsHelp() {
  const { state } = useApp();
  const isDark = state.settings.theme === 'dark';
  const lang = state.settings.language;

  const title = lang === 'fr' ? 'Raccourcis de lecture' : 'Reading shortcuts';
  const line1 =
    lang === 'fr'
      ? 'Touchez la loupe pour rouvrir votre dernier passage. Les boutons 1 • 2 • 3 ouvrent vos emplacements enregistrés.'
      : 'Tap the magnifier to reopen your last passage. Buttons 1 • 2 • 3 open your saved locations.';

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
      <h2 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        {title}
      </h2>
      <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{line1}</p>

      {/* Illustration : bandeau loupe + 1 2 3 (aligné avec le design actuel) */}
      <div className="mt-5 flex justify-center">
        <div
          className={`flex items-center gap-3 rounded-full px-4 py-2 border ${
            isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
          } shadow-sm`}
          aria-label={lang === 'fr' ? 'Illustration des raccourcis' : 'Shortcuts illustration'}
        >
          {/* Loupe (slot 0) */}
          <div
            className={`h-9 w-9 rounded-full flex items-center justify-center ${
              isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
            }`}
            title={lang === 'fr' ? 'Dernier passage' : 'Last passage'}
          >
            <Search size={18} />
          </div>

          {/* Boutons 1 / 2 / 3 */}
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-9 w-9 rounded-full text-sm font-semibold flex items-center justify-center ${
                isDark
                  ? 'bg-gray-800 text-gray-200 border border-gray-600'
                  : 'bg-white text-gray-800 border border-gray-300'
              }`}
              title={lang === 'fr' ? `Raccourci ${n}` : `Shortcut ${n}`}
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
