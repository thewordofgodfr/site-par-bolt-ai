import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { searchInBible, copyToClipboard } from '../services/bibleService';
import { BibleVerse } from '../types/bible';
import { Search as SearchIcon, X, Copy as CopyIcon, Check, BookOpen } from 'lucide-react';
import { highlightText } from '../utils/searchUtils';

export default function Search() {
  const { state, navigateToVerse } = useApp();
  const { t } = useTranslation();

  const isDark = state.settings.theme === 'dark';
  const MIN_CHARS = 2;

  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [committedQuery, setCommittedQuery] = useState('');
  const [results, setResults] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState(50);

  // Focus auto sur desktop/tablette
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      inputRef.current?.focus();
    }
  }, []);

  // Soumission
  const runSearch = async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < MIN_CHARS) {
      setHint(
        state.settings.language === 'fr'
          ? `Tape au moins ${MIN_CHARS} caractères pour rechercher`
          : `Type at least ${MIN_CHARS} characters to search`
      );
      setCommittedQuery('');
      setResults([]);
      setVisibleCount(50);
      return;
    }

    setHint('');
    setLoading(true);
    setCommittedQuery(trimmed);
    setVisibleCount(50);

    try {
      const found = await searchInBible(trimmed, state.settings.language);
      setResults(found);
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const clearSearch = () => {
    setQuery('');
    setCommittedQuery('');
    setResults([]);
    setHint('');
    setVisibleCount(50);
    inputRef.current?.focus();
  };

  const copyVerse = async (v: BibleVerse) => {
    const payload = `${v.reference}\n${v.text}`;
    const ok = await copyToClipboard(payload);
    if (ok) {
      setCopiedKey(`${v.book}-${v.chapter}-${v.verse}`);
      setTimeout(() => setCopiedKey(''), 1500);
    }
  };

  const showMore = () => setVisibleCount((n) => n + 50);

  // Suggestions par défaut (simples exemples)
  const examples =
    state.settings.language === 'fr'
      ? ['amour', 'foi', 'grâce', 'Jésus', 'esprit']
      : ['love', 'faith', 'grace', 'Jesus', 'spirit'];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      {/* Barre de recherche — sticky sous la nav */}
      <div className="sticky top-20 sm:top-16 z-30 bg-transparent py-1">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="max-w-6xl mx-auto">
            <div className={`${isDark ? 'bg-gray-900/80' : 'bg-white/90'} backdrop-blur rounded-md sm:rounded-lg p-2 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <form onSubmit={onSubmit}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                    <SearchIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      state.settings.language === 'fr'
                        ? 'Taper un mot ou une phrase…'
                        : 'Search a word or phrase…'
                    }
                    className={`w-full pl-9 sm:pl-11 pr-20 sm:pr-24 py-2 sm:py-2.5 rounded-md sm:rounded-lg border transition-all duration-200 text-sm sm:text-base ${
                      isDark
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-1 sm:pr-2 flex items-center space-x-1">
                    {query && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        aria-label={state.settings.language === 'fr' ? 'Effacer' : 'Clear'}
                        className={`p-1.5 rounded-md ${
                          isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="submit"
                      className={`px-3 py-1.5 rounded-md font-medium transition ${
                        query.trim().length >= MIN_CHARS
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : isDark
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={query.trim().length < MIN_CHARS}
                    >
                      {state.settings.language === 'fr' ? 'Rechercher' : 'Search'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Aide / état */}
              <div className="mt-1">
                {hint ? (
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{hint}</p>
                ) : loading ? (
                  <div className="flex items-center justify-center">
                    <div className={`animate-spin rounded-full h-5 w-5 border-b-2 mr-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`} />
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {state.settings.language === 'fr' ? 'Recherche en cours…' : 'Searching…'}
                    </p>
                  </div>
                ) : committedQuery ? (
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {state.settings.language === 'fr'
                      ? `${results.length} résultat${results.length > 1 ? 's' : ''} pour « ${committedQuery} »`
                      : `${results.length} result${results.length > 1 ? 's' : ''} for “${committedQuery}”`}
                  </p>
                ) : (
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {state.settings.language === 'fr'
                      ? 'Exemples : ' + examples.map((w) => `« ${w} »`).join(', ')
                      : 'Examples: ' + examples.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Résultats (flux unique, pas de scroll imbriqué) */}
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Vide / écran d’accueil */}
          {!committedQuery && !loading && results.length === 0 && (
            <div className={`${isDark ? 'text-gray-300' : 'text-gray-700'} text-center py-16`}>
              <BookOpen size={40} className={`mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className="text-base sm:text-lg">
                {state.settings.language === 'fr'
                  ? 'Tape un mot-clé pour lancer une recherche dans toute la Bible.'
                  : 'Type a keyword to search the whole Bible.'}
              </p>
            </div>
          )}

          {/* Aucun résultat */}
          {committedQuery && !loading && results.length === 0 && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow p-8 mt-6 text-center`}>
              <SearchIcon size={36} className={`mx-auto mb-3 opacity-60 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {state.settings.language === 'fr' ? 'Aucun résultat trouvé' : 'No results found'}
              </h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {state.settings.language === 'fr'
                  ? `Aucun verset ne correspond à « ${committedQuery} ».`
                  : `No verses match “${committedQuery}”.`}
              </p>
            </div>
          )}

          {/* Liste des résultats */}
          {results.length > 0 && (
            <div className="mt-4 space-y-3">
              {results.slice(0, visibleCount).map((v) => {
                const key = `${v.book}-${v.chapter}-${v.verse}`;
                const copied = copiedKey === key;

                return (
                  <div
                    key={key}
                    onClick={() => navigateToVerse(v.book, v.chapter, v.verse)}
                    className={`group relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                      isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {/* bouton Copier (desktop/tablette) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyVerse(v);
                      }}
                      className={`hidden sm:inline-flex absolute right-2 top-2 items-center text-xs rounded px-2 py-1 transition ${
                        isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={state.settings.language === 'fr' ? 'Copier ce verset' : 'Copy this verse'}
                    >
                      {copied ? <Check size={14} className="mr-1" /> : <CopyIcon size={14} className="mr-1" />}
                      {copied ? (state.settings.language === 'fr' ? 'Copié' : 'Copied') : (state.settings.language === 'fr' ? 'Copier' : 'Copy')}
                    </button>

                    {/* mobile : petit bouton sous le texte */}
                    <div className="sm:hidden text-right mb-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyVerse(v);
                        }}
                        className={`${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'} inline-flex items-center text-xs rounded px-2 py-1`}
                        title={state.settings.language === 'fr' ? 'Copier ce verset' : 'Copy this verse'}
                      >
                        <CopyIcon size={14} className="mr-1" />
                        {state.settings.language === 'fr' ? 'Copier' : 'Copy'}
                      </button>
                    </div>

                    <div className={`${isDark ? 'text-blue-300' : 'text-blue-700'} text-left text-sm font-medium mb-1`}>
                      {v.reference}
                    </div>

                    <div
                      className={`${isDark ? 'text-gray-200' : 'text-gray-700'} leading-relaxed`}
                      style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.7' }}
                      dangerouslySetInnerHTML={{ __html: highlightText(v.text, committedQuery) }}
                    />
                  </div>
                );
              })}

              {/* Afficher plus */}
              {visibleCount < results.length && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={showMore}
                    className={`px-5 py-2 rounded-lg font-medium transition ${
                      isDark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {state.settings.language === 'fr'
                      ? `Afficher plus (${Math.min(50, results.length - visibleCount)})`
                      : `Show more (${Math.min(50, results.length - visibleCount)})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

