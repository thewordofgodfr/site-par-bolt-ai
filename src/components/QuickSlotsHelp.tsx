import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Info } from 'lucide-react';

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
        '🔎 : ouvre le dernier passage consulté (recherche ou « Verset aléatoire »). N’écrase jamais 1/2/3.',
        '1 • 2 • 3 : emplacements personnels.',
        'Quand un numéro est actif, il se met à jour automatiquement pendant la navigation.',
        'Les mémoires sont gardées uniquement sur cet appareil (stockage local).',
      ],
    },
    en: {
      title: 'Reading shortcuts (🔎 • 1 • 2 • 3)',
      intro:
        'These 4 buttons, aligned to the right of the Book/Chapter selector, let you jump back to frequent readings instantly.',
      items: [
        '🔎 : opens the last passage you viewed (search or “Random verse”). It never overwrites 1/2/3.',
        '1 • 2 • 3: personal slots.',
        'When a number is active, it auto-updates while you navigate.',
        'Slots are stored only on this device (local storage).',
      ],
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
    </section>
  );
}

