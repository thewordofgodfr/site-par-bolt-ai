import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Info, Search as SearchIcon } from 'lucide-react';

export default function QuickSlotsHelp() {
  const { state } = useApp();
  const isDark = state.settings.theme === 'dark';
  const lang = state.settings.language === 'fr' ? 'fr' : 'en';

  // --- Accessibilité/tailles lisibles ---
  const base = Math.max(state.settings.fontSize ?? 20, 20); // toujours ≥ 20px
  const titleSize = Math.min(36, base + 10); // 30–36px
  const bodySize = Math.min(28, base + 4);   // 24–28px
  const bulletSize = bodySize;
  const lineHeight = 1.8;
  const chip = 48; // taille des pastilles d’aperçu (px)

  const copy = {
    fr: {
      title: 'Raccourcis de lecture',
      intro:
        'Ces 4 boutons, alignés à droite du sélecteur Livre/Chapitre, servent à revenir instantanément sur vos lectures fréquentes. Pratique pour lire plusieurs livres en parallèle : utilisez 1/2/3 pour des emplacements différents, et 🔎 pour revenir au dernier passage consulté.',
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
        'These 4 buttons, aligned to the right of the Book/Chapter selector, let you jump back to frequent readings instantly. Handy to read several books in parallel: use 1/2/3 for different locations, and 🔎 to resume the last passage.',
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
      className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6 md:p-7 shadow-lg`}
    >
      {/* Titre + icône */}
      <header className="flex items-center gap-3">
        <Info className={`${isDark ? 'text-blue-300' : 'text-blue-700'}`} size={24} />
        <h3
          className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold`}
          style={{ fontSize: `${titleSize}px`, lineHeight }}
        >
          {copy.title}
        </h3>
      </header>

      {/* Aperçu sous le titre */}
      <div
        className={`mt-3 mb-6 flex items-center gap-4 rounded-2xl px-4 py-3 border ${
          isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
        }`}
        aria-label={lang === 'fr' ? 'Illustration des raccourcis' : 'Shortcuts illustration'}
      >
        {/* Loupe */}
        <div
          className={`rounded-full flex items-center justify-center border ${
            isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-800'
          }`}
          style={{ width: chip, height: chip }}
          title={lang === 'fr' ? 'Dernier passage' : 'Last passage'}
        >
          <SearchIcon size={20} />
        </div>

        {/* 1 actif */}
        <div
          className={`rounded-full flex items-center justify-center font-semibold ring-2 border ${
            isDark
              ? 'bg-blue-600 text-white ring-blue-300/40 border-blue-600'
              : 'bg-blue-600 text-white ring-blue-200 border-blue-600'
          }`}
          style={{ width: chip, height: chip, fontSize: 18 }}
          title={lang === 'fr' ? 'Raccourci 1 (actif)' : 'Shortcut 1 (active)'}
        >
          1
        </div>

        {/* 2 & 3 inactifs */}
        {[2, 3].map((n) => (
          <div
            key={n}
            className={`rounded-full flex items-center justify-center font-semibold border ${
              isDark ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-300'
            }`}
            style={{ width: chip, height: chip, fontSize: 18 }}
            title={(lang === 'fr' ? 'Raccourci ' : 'Shortcut ') + n}
          >
            {n}
          </div>
        ))}
      </div>

      {/* Intro très lisible */}
      <p
        className={`${isDark ? 'text-gray-100' : 'text-gray-900'}`}
        style={{ fontSize: `${bodySize}px`, lineHeight, marginBottom: '18px' }}
      >
        {copy.intro}
      </p>

      {/* Points clés très lisibles */}
      <ul className="space-y-3">
        {copy.items.map((line, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              style={{ fontSize: `${bulletSize}px`, lineHeight }}
            >
              •
            </span>
            <span
              className={`${isDark ? 'text-gray-100' : 'text-gray-900'}`}
              style={{ fontSize: `${bodySize}px`, lineHeight }}
            >
              {line}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
