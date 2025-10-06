import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Search as SearchIcon, Bookmark, Info } from 'lucide-react';

export default function QuickSlotsHelp() {
  const { state } = useApp();
  const isDark = state.settings.theme === 'dark';
  const lang = state.settings.language === 'fr' ? 'fr' : 'en';

  const copy = {
    fr: {
      title: 'Raccourcis de lecture (🔎 • 1 • 2 • 3)',
      intro:
        'Ces 4 boutons, alignés à droite du sélecteur Livre/Chapitre, servent à revenir instantanément sur vos lectures fréquentes.',
      items: [
        '🔎 : mène au dernier verset ouvert depuis la recherche. Ce bouton n’écrase jamais 1/2/3.',
        '1 • 2 • 3 : mémoires personnelles.',
        'Si la mémoire est vide : appuyer sur 1/2/3 enregistre l’endroit actuel.',
        'Quand vous utilisez 1/2/3, ce numéro devient “actif” et se met à jour automatiquement pendant que vous changez de livre/chapitre.',
        'Pour mémoriser un autre endroit : appuyez sur 1/2/3 (pour l’activer), allez où vous voulez — c’est enregistré automatiquement.',
        'Les mémoires sont gardées uniquement sur cet appareil (stockage local), et fonctionnent en français ou en anglais.',
      ],
      tip: 'Astuce : 🔎 est pratique pour reprendre exactement sur un verset trouvé via la recherche, sans toucher à vos mémoires 1/2/3.',
    },
    en: {
      title: 'Reading shortcuts (🔎 • 1 • 2 • 3)',
      intro:
        'These 4 buttons, aligned to the right of the Book/Chapter selector, let you jump back to frequent readings instantly.',
      items: [
        '🔎 : jumps to the last verse you opened from search. It never overwrites 1/2/3.',
        '1 • 2 • 3 : personal memories (bookmarks).',
        'If the memory is empty: tapping 1/2/3 saves your current place.',
        'When you use 1/2/3, that number becomes “active” and auto-updates while you navigate between books/chapters.',
        'To save a different place: tap 1/2/3 (to activate it), go where you want — it will save automatically.',
        'Memories are stored only on this device (local storage) and work in French or English.',
      ],
      tip: 'Tip: use 🔎 to resume exactly where a search took you, without touching your 1/2/3 memories.',
    },
  }[lang];

  return (
    <section
      className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-4 md:p-5 shadow-sm`}
    >
      <header className="flex items-center gap-2 mb-2">
        <Info className={`${isDark ? 'text-blue-300' : 'text-blue-700'}`} size={18} />
        <h3 className={`text-base md:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {copy.title}
        </h3>
      </header>

      <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} text-sm mb-3`}>
        {copy.intro}
      </p>

      <ul className="space-y-2 text-sm">
        {copy.items.map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>•</span>
            <span className={`${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{line}</span>
          </li>
        ))}
      </ul>

      <div
        className={`${isDark ? 'bg-indigo-900/30 text-indigo-200' : 'bg-indigo-50 text-indigo-800'} mt-4 rounded-lg px-3 py-2 text-sm flex items-start gap-2`}
      >
        <SearchIcon className="w-4 h-4 mt-0.5" />
        <p>{copy.tip}</p>
      </div>

      {/* petite légende visuelle */}
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className={`${isDark ? 'bg-white text-indigo-800' : 'bg-white text-indigo-700'} border border-indigo-300 rounded-full px-2 py-1 inline-flex items-center gap-1`}>
          <SearchIcon className="w-3.5 h-3.5" />
          <span>🔎</span>
        </span>
        <span className="px-2 py-1 rounded-full bg-blue-600 text-white">1</span>
        <span className={`${isDark ? 'bg-gray-800 text-gray-200 border border-gray-600' : 'bg-white text-gray-800 border border-gray-300'} px-2 py-1 rounded-full`}>2</span>
        <span className={`${isDark ? 'bg-gray-800 text-gray-200 border border-gray-600' : 'bg-white text-gray-800 border border-gray-300'} px-2 py-1 rounded-full`}>3</span>
        <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} ml-2 inline-flex items-center gap-1`}>
          <Bookmark className="w-3.5 h-3.5" />
          <span>{lang === 'fr' ? 'mémoires' : 'memories'}</span>
        </span>
      </div>
    </section>
  );
}
