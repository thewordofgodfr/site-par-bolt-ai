import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { getBibleBooks, searchInBible, copyToClipboard } from '../services/bibleService';
import type { BibleVerse } from '../types/bible';
import {
  BookOpen,
  Check,
  Copy as CopyIcon,
  Loader2,
  Search as SearchIcon,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { highlightText } from '../utils/searchUtils';

type Grouped = {
  bookId: string;               // id interne (ex: "Genesis")
  displayName: string;          // nom selon la langue (ex: "Genèse")
  verses: BibleVerse[];
};

export default function Search() {
  const { state, navigateToVerse } = useApp();
  const { t } = useTranslation();
  const isDark = state.settings.theme === 'dark';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // par livre

  const books = useMemo(() => getBibleBooks(), []);
  const getBookName = (id: string) => {
    const b = books.find(x => x.name === id);
    if (!b) return id;
    return state.settings.language === 'fr' ? b.nameFr : b.nameEn;
  };
  const bibleOrder = (id: string) => {
    const idx = books.findIndex(b => b.name === id);
    return idx === -1 ? 9999 : idx;
  };

  useEffect(() => {
    document.title = state.settings.language === 'fr' ? 'Recherche biblique' : 'Bible Search';
  }, [state.settings.language]);

  // Lancement recherche (petit debounce)
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchInBible(query, state.settings.language);
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query, state.settings.language]);

  // Groupement par livre
  const grouped: Grouped[] = useMemo(() => {
    const map = new Map<string, BibleVerse[]>();
    for (const v of results) {
      if (!map.has(v.book)) map.set(v.book, []);
      map.get(v.book)!.push(v);
    }
    const arr: Grouped[] = Array.from(map.entries()).map(([bookId, verses]) => ({
      bookId,
      displayName: getBookName(bookId),
      verses: verses.sort((a, b) => a.chapter === b.chapter ? a.verse - b.verse : a.chapter - b.chapter),
    }));
    // Tri selon l'ordre biblique
    arr.sort((a, b) => bibleOrder(a.bookId) - bibleOrder(b.bookId));
    return arr;
  }, [results, state.settings.language, books]);

  // Définir l'état d'ouverture par défaut quand les résultats changent
  useEffect(() => {
    // Par défaut : si peu de groupes (<= 2), tout ouvert ; sinon tout fermé
    const open = grouped.length <= 2;
    const next: Record<string, boolean> = {};
    for (const g of grouped) next[g.bookId] = open;
    setExpanded(next);
  }, [grouped]);

  const toggleGroup = (bookId: string) => {
    setExpanded(prev => ({ ...prev, [bookId]: !prev[bookId] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const g of grouped) next[g.bookId] = true;
    setExpanded(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    for (const g of grouped) next[g.bookId] = false;
    setExpanded(next);
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
  };

  const openInReading = (v: BibleVerse) => {
    navigateToVerse(v.book, v.chapter, v.verse);
  };

  const copyVerse = async (v: BibleVerse) => {
    const ok = await copyToClipboard(`${v.reference}\n${v.text}`);
    if (ok) {
      const key = `${v.book}-${v.chapter}-${v.verse}`;
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1200);
    }
  };

  const total = results.length;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors`}>
      <div className="max-w-4xl mx-auto px-4 py-5">
        {/* Barre de recherche (indépendante de Lecture) */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-3 sticky top-20 sm:top-16 z-30`}>
          <form onSubmit={e => e.preventDefault()} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className={isDark ? 'text-gray-400' : 'text-gray-500'} size={18} />
            </div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              type="text"
              placeholder={
                state.settings.language === 'fr'
                  ? 'Tapez votre recherche'
                  : 'Type your search'
              }
              className={`w-full pl-10 pr-20 py-3 rounded-lg border-2 focus:outline-none transition ${
                isDark
                  ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              }`}
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center space-x-1">
              {!!query && (
                <button
                  type="button"
                  onClick={clearQuery}
                  className={`p-2 rounded-lg ${
                    isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label={state.settings.language === 'fr' ? 'Effacer' : 'Clear'}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </form>

          <div className="mt-2 text-sm flex items-center justify-between">
            <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              {loading ? (
                <>
                  <Loader2 className="inline mr-2 animate-spin" size={16} />
                  {state.settings.language === 'fr' ? 'Recherche en cours…' : 'Searching…'}
                </>
              ) : query.trim().length >= 2 ? (
                <>
                  {state.settings.language === 'fr' ? 'Résultats' : 'Results'} "{query}" ({total})
                </>
              ) : (
                state.settings.language === 'fr'
                  ? 'Saisissez au moins 2 caractères pour lancer la recherche.'
                  : 'Type at least 2 characters to search.'
              )}
            </div>

            {grouped.length > 1 && total > 0 && !loading && (
              <div className="space-x-2">
                <button
                  onClick={expandAll}
                  className="text-xs px-2 py-1 rounded border border-transparent bg-blue-600 text-white hover:bg-blue-500"
                >
                  {state.settings.language === 'fr' ? 'Tout ouvrir' : 'Expand all'}
                </button>
                <button
                  onClick={collapseAll}
                  className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {state.settings.language === 'fr' ? 'Tout fermer' : 'Collapse all'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Groupes par livre */}
        <div className="mt-4">
          {total === 0 && !loading && query.trim().length >= 2 && (
            <div className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-center py-10`}>
              {state.settings.language === 'fr'
                ? 'Aucun verset trouvé.'
                : 'No verses found.'}
            </div>
          )}

          {grouped.map(group => {
            const open = !!expanded[group.bookId];
            const count = group.verses.length;

            return (
              <div
                key={group.bookId}
                className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg mb-3 overflow-hidden`}
              >
                {/* En-tête cliquable */}
                <button
                  onClick={() => toggleGroup(group.bookId)}
                  className={`w-full flex items-center justify-between px-4 py-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}
                  aria-expanded={open}
                >
                  <div className="flex items-center">
                    {open ? (
                      <ChevronDown className={`mr-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`} size={18} />
                    ) : (
                      <ChevronRight className={`mr-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`} size={18} />
                    )}
                    <span className="font-semibold">{group.displayName}</span>
                  </div>
                  <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>({count})</span>
                </button>

                {/* Liste des versets du groupe */}
                {open && (
                  <div className="px-4 pb-3 space-y-3">
                    {group.verses.map(v => {
                      const key = `${v.book}-${v.chapter}-${v.verse}`;
                      const copied = copiedKey === key;
                      return (
                        <div
                          key={key}
                          className={`${isDark ? 'bg-gray-750/50' : 'bg-gray-50'} rounded-md p-3 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                        >
                          <div className={`${isDark ? 'text-blue-300' : 'text-blue-700'} font-medium mb-1`}>
                            {getBookName(v.book)} {v.chapter}:{v.verse}
                          </div>
                          <div
                            className={isDark ? 'text-gray-200' : 'text-gray-700'}
                            style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.7' }}
                            dangerouslySetInnerHTML={{ __html: highlightText(v.text, query) }}
                          />
                          <div className="mt-2 flex justify-end space-x-2">
                            <button
                              onClick={() => copyVerse(v)}
                              className={`${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} px-3 py-1.5 rounded text-sm inline-flex items-center`}
                            >
                              {copied ? <Check size={16} className="mr-1" /> : <CopyIcon size={16} className="mr-1" />}
                              {copied ? (state.settings.language === 'fr' ? 'Copié' : 'Copied') : (state.settings.language === 'fr' ? 'Copier' : 'Copy')}
                            </button>
                            <button
                              onClick={() => openInReading(v)}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm inline-flex items-center"
                            >
                              <BookOpen size={16} className="mr-1" />
                              {state.settings.language === 'fr' ? 'Ouvrir' : 'Open'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

