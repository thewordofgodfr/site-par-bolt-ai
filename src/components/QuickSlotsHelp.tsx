import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Info, Search as SearchIcon } from 'lucide-react';

export default function QuickSlotsHelp() {
  const { state } = useApp();
  const isDark = state.settings.theme === 'dark';
  const lang = state.settings.language === 'fr' ? 'fr' : 'en';

  // Tailles fixes pour ce bloc (indépendantes du réglage global)
  const TITLE_SIZE = 20;
  const BODY_SIZE = 18;
  const LINE_HEIGHT = 1.7;
  const CHIP = 40;

  const copy = {
    fr: {
      title: 'Raccourcis de lecture',
      intro:
        'Ces 4 boutons, alignés à droite du sélecteur Livre/Chapitre, permettent de revenir instantanément sur vos lectures fréquentes — pratique pour lire plusieurs livres en parallèle : utilisez 1/2/3 pour des emplacements distincts, et 🔎 pour revenir au dernier passage consulté.',
      items: [
        '🔎 : ouvre le dernier passage consulté (recherche ou « Verset aléatoire »). N’écrase jamais 1/2/3.',
        '1 • 2 • 3 : emplacements personnels (vous pouvez assigner des livres différents).',
        'Quand un numéro est actif, il se met à jour automatiquement pendant la navigation.',
        'Les mémoires sont gardées uniquement sur cet appareil (stockage local).',
      ],
      preview: 'Aperçu',
    },
    en: {
      title: 'Reading shortcuts',
      intro:
        'These 4 buttons, aligned to the right of the Book/Chapter selector, let you jump back to frequent readings instantly — handy to read several books in parallel: use 1/2/3 for different locations, and 🔎 to resume the last passage.',
      items: [
        '🔎 : opens the last passage you viewed (search or “Random verse”). It never overwrites 1/2/3.',
        '1 • 2 • 3: personal slots (you can assign different books).',
        'When a number is active, it auto-updates while you navigate.',
        'Slots are stored only on this device (local storage).',
      ],
      preview: 'Preview',
    },
  }[lang];

  return (
    <section
      className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-5 md:p-6 shadow-lg`}
    >
      {/* Titre */}
      <header className="flex items-center gap-3">
        <Info className={`${isDark ? 'text-blue-300' : 'text-blue-700'}`} size={18} />
        <h3
          className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold`}
          style={{ fontSize: `${TITLE_SIZE}px`, lineHeight: LINE_HEIGHT }}
        >
          {copy.title}
        </h3>
      </header>

      {/* Aperçu */}
      <div className="mt-3 mb-4">
        <div
          className={`flex items-center gap-8 rounded-2xl px-4 py-3 border ${
            isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
          }`}
          aria-label={lang === 'fr' ? 'Illustration des raccourcis' : 'Shortcuts illustration'}
        >
          {/* Loupe (bleu, comme dans Lecture) */}
          <div
            className={`rounded-full flex items-center justify-center border ${
              isDark ? 'bg-gray-800 border-blue-400/60 text-blue-200' : 'bg-white border-blue-300 text-blue-700'
            }`}
            style={{ width: CHIP, height: CHIP }}
            title={lang === 'fr' ? 'Dernier passage' : 'Last passage'}
          >
            <SearchIcon size={18} />
          </div>

          {/* 1 actif — AMBRE */}
          <div
            className={`rounded-full flex items-center justify-center font-semibold ring-2 border ${
              isDark
                ? 'bg-amber-600 text-white ring-amber-300/50 border-amber-600'
                : 'bg-amber-600 text-white ring-amber-300 border-amber-600'
            }`}
            style={{ width: CHIP, height: CHIP, fontSize: 16 }}
            title={lang === 'fr' ? 'Raccourci 1 (actif)' : 'Shortcut 1 (active)'}
          >
            1
          </div>

          {/* 2 — VIOLET (inactif mais coloré) */}
          <div
            className={`rounded-full flex items-center justify-center font-semibold border ${
              isDark ? 'bg-violet-600 text-white border-violet-600' : 'bg-violet-600 text-white border-violet-600'
            }`}
            style={{ width: CHIP, height: CHIP, fontSize: 16 }}
            title={(lang === 'fr' ? 'Raccourci ' : 'Shortcut ') + '2'}
          >
            2
          </div>

          {/* 3 — ÉMERAUDE (inactif mais coloré) */}
          <div
            className={`rounded-full flex items-center justify-center font-semibold border ${
              isDark ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-600 text-white border-emerald-600'
            }`}
            style={{ width: CHIP, height: CHIP, fontSize: 16 }}
            title={(lang === 'fr' ? 'Raccourci ' : 'Shortcut ') + '3'}
          >
            3
          </div>
        </div>
      </div>

      {/* Intro + liste en 18px */}
      <p
        className={`${isDark ? 'text-gray-100' : 'text-gray-900'}`}
        style={{ fontSize: `${BODY_SIZE}px`, lineHeight: LINE_HEIGHT, marginBottom: '14px' }}
      >
        {copy.intro}
      </p>

      <ul className="space-y-2.5">
        {copy.items.map((line, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              style={{ fontSize: `${BODY_SIZE}px`, lineHeight: LINE_HEIGHT }}
            >
              •
            </span>
            <span
              className={`${isDark ? 'text-gray-100' : 'text-gray-900'}`}
              style={{ fontSize: `${BODY_SIZE}px`, lineHeight: LINE_HEIGHT }}
            >
              {line}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

