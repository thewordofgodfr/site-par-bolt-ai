import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { getBibleBooks, getChapter, searchInBible, copyToClipboard } from '../services/bibleService';
import { BibleBook, BibleChapter } from '../types/bible';
import {
  ChevronDown,
  Book,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  BookOpen,
  Copy as CopyIcon,
  Check
} from 'lucide-react';
import { highlightText } from '../utils/searchUtils';

export default function Reading() {
  const { state, dispatch, saveReadingPosition } = useApp();
  const { t } = useTranslation();

  const NAV_H = (typeof window !== 'undefined' && window.innerWidth < 640) ? 80 : 64; // hauteur de la nav (h-16)
  const searchRef = useRef<HTMLDivElement>(null);
  const [searchH, setSearchH] = useState(0);

  const [books] = useState<BibleBook[]>(getBibleBooks());
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapter, setChapter] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);

  // Recherche
  const [searchInput, setSearchInput] = useState<string>('');
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHint, setSearchHint] = useState<string>('');
  const MIN_CHARS = 2;

  // Mise en évidence (ex. depuis résultats)
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);

  // Sélection au tap
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [copiedKey, setCopiedKey] = useState<string>('');

  // Sélecteur Livres (overlay) — maintenant sur TOUTES tailles d’écran
  const [showBookPicker, setShowBookPicker] = useState<boolean>(false);

  const [showRestoredNotification, setShowRestoredNotification] = useState(false);

  const isDark = state.settings.theme === 'dark';

  // ====== Chargement du chapitre ======
  const fetchChapter = async (book: BibleBook, chapterNum: number) => {
    setLoading(true);
    try {
      const chapterData = await getChapter(book.name, chapterNum, state.settings.language);
      setChapter(chapterData);
    } catch (error) {
      console.error('Error fetching chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSelect = (book: BibleBook) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    fetchChapter(book, 1);
    saveReadingPosition(book.name, 1);
    setShowRestoredNotification(false);
    setSelectedVerses([]);
    setHighlightedVerse(null);
    setShowBookPicker(false);
  };

  const handleChapterSelect = (chapterNum: number) => {
    setSelectedChapter(chapterNum);
    if (selectedBook) {
      fetchChapter(selectedBook, chapterNum);
      saveReadingPosition(selectedBook.name, chapterNum);
      setShowRestoredNotification(false);
      setSelectedVerses([]);
      setHighlightedVerse(null);
    }
  };

  const handlePreviousChapter = () => {
    if (selectedBook && selectedChapter > 1) handleChapterSelect(selectedChapter - 1);
  };
  const handleNextChapter = () => {
    if (selectedBook && selectedChapter < selectedBook.chapters) handleChapterSelect(selectedChapter + 1);
  };

  // ====== Recherche ======
  const performSearch = async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < MIN_CHARS) {
      setSearchHint(
        state.settings.language === 'fr'
          ? `Tape au moins ${MIN_CHARS} caractères pour rechercher`
          : `Type at least ${MIN_CHARS} characters to search`
      );
      setShowGlobalSearch(false);
      setGlobalSearchResults([]);
      setGlobalSearchTerm('');
      return;
    }

    setSearchHint('');
    setSearchLoading(true);
    setShowGlobalSearch(true);
    setGlobalSearchTerm(trimmed);

    try {
      const results = await searchInBible(trimmed, state.settings.language);
      setGlobalSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setGlobalSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchInput);
  };

  const clearGlobalSearch = () => {
    setSearchInput('');
    setGlobalSearchTerm('');
    setGlobalSearchResults([]);
    setShowGlobalSearch(false);
    setSearchHint('');
  };

  const handleResultClick = (book: string, chapterNum: number, verseNum: number) => {
    const bookObj = resolveBook(book);
    if (bookObj) {
      setSelectedBook(bookObj);
      setSelectedChapter(chapterNum);
      setHighlightedVerse(verseNum);
      fetchChapter(bookObj, chapterNum);
      setShowGlobalSearch(false);
      saveReadingPosition(bookObj.name, chapterNum);
      setSelectedVerses([]);
    }
  };

  const copyFromSearchResult = async (verse: any) => {
    const payload = `${verse.reference}\n${verse.text}`;
    const ok = await copyToClipboard(payload);
    const key = `${verse.book}-${verse.chapter}-${verse.verse}`;
    if (ok) {
      setCopiedKey(`search-${key}`);
      setTimeout(() => setCopiedKey(''), 1500);
    }
  };

  const oldTestamentBooks = books.filter(book => book.testament === 'old');
  const newTestamentBooks = books.filter(book => book.testament === 'new');
  const getBookName = (book: BibleBook) => (state.settings.language === 'fr' ? book.nameFr : book.nameEn);

  // Helper pour résoudre un nom de livre (FR/EN/ID interne)
  const resolveBook = (bookIdentifier: string): BibleBook | null => {
    // D'abord chercher par nom interne (identifiant anglais)
    let found = books.find(b => b.name === bookIdentifier);
    if (found) return found;

    // Sinon chercher par nom anglais
    found = books.find(b => b.nameEn === bookIdentifier);
    if (found) return found;

    // Sinon chercher par nom français
    found = books.find(b => b.nameFr === bookIdentifier);
    if (found) return found;

    return null;
  };

  // Mesurer la hauteur de la barre de recherche pour positionner la barre de commandes
  useEffect(() => {
    const compute = () => setSearchH(searchRef.current?.offsetHeight || 0);
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Navigation contextuelle - s'exécute une seule fois au montage
  const [hasLoadedContext, setHasLoadedContext] = useState(false);

  useEffect(() => {
    if (!hasLoadedContext && state.readingContext && state.readingContext.book && state.readingContext.chapter > 0) {
      const book = resolveBook(state.readingContext.book);
      if (book) {
        setSelectedBook(book);
        setSelectedChapter(state.readingContext!.chapter);
        fetchChapter(book, state.readingContext!.chapter);
        setShowRestoredNotification(false);
        setSelectedVerses([]);
        // Si on a un numéro de verset, le mettre en surbrillance
        if (state.readingContext.verse) {
          setHighlightedVerse(state.readingContext.verse);
        } else {
          setHighlightedVerse(null);
        }
        setHasLoadedContext(true);
        // Réinitialiser le contexte après l'avoir utilisé
        dispatch({ type: 'SET_READING_CONTEXT', payload: { book: '', chapter: 0 } });
      } else {
        // Livre non trouvé, nettoyer le contexte pour laisser le chargement par défaut
        dispatch({ type: 'SET_READING_CONTEXT', payload: { book: '', chapter: 0 } });
      }
    }
  }, [state.readingContext, books, hasLoadedContext, dispatch]);

  // Quand la langue change
  useEffect(() => {
    if (selectedBook && selectedChapter) {
      fetchChapter(selectedBook, selectedChapter);
      saveReadingPosition(selectedBook.name, selectedChapter);
      setShowRestoredNotification(false);
    }
    if (globalSearchTerm.trim()) {
      (async () => {
        setSearchLoading(true);
        try {
          const results = await searchInBible(globalSearchTerm, state.settings.language);
          setGlobalSearchResults(results);
          setShowGlobalSearch(true);
        } catch (e) {
          console.error('Search error after language change:', e);
          setGlobalSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      })();
    }
  }, [state.settings.language]);

  // Chargement initial - uniquement si pas de contexte de navigation
  useEffect(() => {
    // Ignorer si on a un contexte de navigation actif
    if (state.readingContext && state.readingContext.book && state.readingContext.chapter > 0) {
      return;
    }

    if (!selectedBook) {
      const lastPosition = state.settings.lastReadingPosition;
      if (lastPosition?.timestamp) {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (lastPosition.timestamp > thirtyDaysAgo) {
          const savedBook = resolveBook(lastPosition.book);
          if (savedBook) {
            setSelectedBook(savedBook);
            setSelectedChapter(lastPosition.chapter);
            fetchChapter(savedBook, lastPosition.chapter);
            setShowRestoredNotification(true);
            return;
          }
        }
      }
      const matthewBook = resolveBook('Matthew');
      if (matthewBook) {
        setSelectedBook(matthewBook);
        setSelectedChapter(1);
        fetchChapter(matthewBook, 1);
      }
    }
  }, [books, selectedBook, state.readingContext]);

  // Scroll + surbrillance (20s) quand on vient d'une recherche
  useEffect(() => {
    if (highlightedVerse !== null && chapter) {
      const id = `verse-${highlightedVerse}`;
      const timer = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [chapter, highlightedVerse]);

  useEffect(() => {
    if (highlightedVerse !== null) {
      const t = setTimeout(() => setHighlightedVerse(null), 20000);
      return () => clearTimeout(t);
    }
  }, [highlightedVerse]);

  // ===== Sélection par tap verset =====
  const toggleSelectVerse = (num: number) => {
    setSelectedVerses(prev => (prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]));
  };

  const compressRanges = (nums: number[]) => {
    if (nums.length === 0) return '';
    const sorted = [...nums].sort((a, b) => a - b);
    const parts: string[] = [];
    let start = sorted[0];
    let prev = sorted[0];
    const push = () => (start === prev ? parts.push(`${start}`) : parts.push(`${start}-${prev}`));
    for (let i = 1; i < sorted.length; i++) {
      const n = sorted[i];
      if (n === prev + 1) prev = n;
      else {
        push();
        start = n;
        prev = n;
      }
    }
    push();
    return parts.join(',');
  };

  const copySelection = async () => {
    if (!selectedBook || !chapter || selectedVerses.length === 0) return;
    const chosen = chapter.verses
      .filter(v => selectedVerses.includes(v.verse))
      .sort((a, b) => a.verse - b.verse);

    const ranges = compressRanges(chosen.map(v => v.verse));
    const ref = `${getBookName(selectedBook)} ${chapter.chapter}:${ranges}`;
    const body = chosen.map(v => `${v.verse}. ${v.text}`).join('\n');
    const payload = `${ref}\n${body}`;

    const ok = await copyToClipboard(payload);
    if (ok) {
      setCopiedKey('selection');
      setTimeout(() => setCopiedKey(''), 1500);
      setSelectedVerses([]);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      {/* BARRE RECHERCHE — sticky sous la nav */}
      <div ref={searchRef} className="sticky top-20 sm:top-16 z-40 bg-transparent py-0.5">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="max-w-6xl mx-auto">
            <div className={`${isDark ? 'bg-gray-900/80' : 'bg-gray-50/80'} backdrop-blur rounded-md sm:rounded-lg p-1.5 sm:p-2 shadow-sm`}>
              <form onSubmit={handleSubmitSearch}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                    <Search className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={
                      state.settings.language === 'fr'
                        ? 'Rechercher dans toute la Bible... (Entrée ou clic sur la loupe)'
                        : 'Search the whole Bible... (Enter or click the magnifier)'
                    }
                    className={`w-full pl-8 sm:pl-10 pr-16 sm:pr-20 py-1.5 sm:py-2 rounded-md sm:rounded-lg border transition-all duration-200 text-sm sm:text-base ${
                      isDark
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-0.5 sm:pr-1 flex items-center space-x-0.5 sm:space-x-1">
                    {(searchInput || showGlobalSearch) && (
                      <button
                        type="button"
                        onClick={clearGlobalSearch}
                        aria-label={state.settings.language === 'fr' ? 'Effacer la recherche' : 'Clear search'}
                        className={`p-1 sm:p-1.5 rounded-md sm:rounded-lg ${
                          isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                    <button
                      type="submit"
                      aria-label={state.settings.language === 'fr' ? 'Lancer la recherche' : 'Start search'}
                      className={`p-1 sm:p-1.5 rounded-md sm:rounded-lg transition-all duration-200 ${
                        searchInput.trim().length >= MIN_CHARS
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : isDark
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={searchInput.trim().length < MIN_CHARS}
                    >
                      <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </form>

              {/* Aide / compteur */}
              <div className="mt-0.5 sm:mt-1">
                {searchHint ? (
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{searchHint}</p>
                ) : searchLoading ? (
                  <div className="flex items-center justify-center">
                    <div className={`animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 mr-1 sm:mr-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`} />
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {state.settings.language === 'fr' ? 'Recherche en cours...' : 'Searching...'}
                    </p>
                  </div>
                ) : showGlobalSearch ? (
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {globalSearchResults.length > 0
                      ? state.settings.language === 'fr'
                        ? `${globalSearchResults.length} verset${globalSearchResults.length > 1 ? 's' : ''} trouvé${globalSearchResults.length > 1 ? 's' : ''} dans toute la Bible`
                        : `${globalSearchResults.length} verse${globalSearchResults.length > 1 ? 's' : ''} found in the entire Bible`
                      : state.settings.language === 'fr'
                        ? 'Aucun verset trouvé dans la Bible'
                        : 'No verses found in the Bible'}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-4 pb-6">
        <div className="max-w-6xl mx-auto">
          {/* Résultats de recherche */}
          {showGlobalSearch && globalSearchResults.length > 0 && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mt-6 mb-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <BookOpen size={20} className="mr-2" />
                {state.settings.language === 'fr' ? 'Résultats de recherche' : 'Search Results'}
              </h2>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {globalSearchResults.map((verse: any) => {
                  const key = `${verse.book}-${verse.chapter}-${verse.verse}`;
                  const copied = copiedKey === `search-${key}`;
                  return (
                    <div
                      key={key}
                      onClick={() => handleResultClick(verse.book, verse.chapter, verse.verse)}
                      className={`group relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                        isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {/* Copier — desktop/tablette */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyFromSearchResult(verse);
                        }}
                        className={`hidden sm:inline-flex absolute right-2 top-2 items-center text-xs rounded px-2 py-1 transition 
                                    ${isDark ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        title={state.settings.language === 'fr' ? 'Copier ce verset' : 'Copy this verse'}
                      >
                        {copied ? <Check size={14} className="mr-1" /> : <CopyIcon size={14} className="mr-1" />}
                        {copied ? (state.settings.language === 'fr' ? 'Copié' : 'Copied') : (state.settings.language === 'fr' ? 'Copier' : 'Copy')}
                      </button>

                      {/* Copier — mobile (sous le texte) */}
                      <div className="sm:hidden text-right mb-1">
                        <button
                          onClick={(e) => {
                          e.stopPropagation();
                          copyFromSearchResult(verse);
                          }}
                          className={`${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'} inline-flex items-center text-xs rounded px-2 py-1`}
                          title={state.settings.language === 'fr' ? 'Copier ce verset' : 'Copy this verse'}
                        >
                          <CopyIcon size={14} className="mr-1" />
                          {state.settings.language === 'fr' ? 'Copier' : 'Copy'}
                        </button>
                      </div>

                      <div className={`${isDark ? 'text-blue-300' : 'text-blue-700'} text-left text-sm font-medium mb-1`}>
                        {verse.reference}
                      </div>

                      <div
                        className={`${isDark ? 'text-gray-200' : 'text-gray-700'} leading-relaxed`}
                        style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.7' }}
                        dangerouslySetInnerHTML={{ __html: highlightText(verse.text, globalSearchTerm) }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={clearGlobalSearch}
                  className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800'
                  }`}
                >
                  {state.settings.language === 'fr' ? 'Fermer la recherche' : 'Close search'}
                </button>
              </div>
            </div>
          )}

          {/* Aucun résultat */}
          {showGlobalSearch && globalSearchResults.length === 0 && !searchLoading && !searchHint && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 mt-6 mb-6 text-center`}>
              <Search size={48} className={`mx-auto mb-4 opacity-50 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {state.settings.language === 'fr' ? 'Aucun résultat trouvé' : 'No results found'}
              </h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                {state.settings.language === 'fr' ? `Aucun verset trouvé pour "${globalSearchTerm}" dans la Bible` : `No verses found for "${globalSearchTerm}" in the Bible`}
              </p>
              <button
                onClick={clearGlobalSearch}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800'
                }`}
              >
                {state.settings.language === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>
          )}

          {/* Bandeau commandes (Livres + chapitre) — sticky */}
          {selectedBook && (
            <div className="sticky z-30 bg-transparent" style={{ top: `${NAV_H + searchH}px` }}>
              <div className={`${isDark ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur rounded-md sm:rounded-lg shadow-lg p-2 sm:p-3 mb-2 sm:mb-3`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <h2 className={`text-base sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {getBookName(selectedBook)}
                  </h2>

                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* BOUTON LIVRES — plus grand, sur TOUTES tailles */}
                    <button
                      onClick={() => setShowBookPicker(true)}
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold shadow-sm ${
                        isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                    >
                      {state.settings.language === 'fr' ? 'Livres' : 'Books'}
                    </button>

                    {/* Navigation chapitres */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={handlePreviousChapter}
                        disabled={selectedChapter <= 1}
                        className={`p-1 sm:p-1.5 rounded-md sm:rounded-lg transition-all duration-200 ${
                          selectedChapter <= 1
                            ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800'
                        }`}
                      >
                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>

                      <div className="relative">
                        <select
                          value={selectedChapter}
                          onChange={(e) => handleChapterSelect(Number(e.target.value))}
                          className={`appearance-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-md sm:rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 pr-6 sm:pr-7 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
                        >
                          {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                        <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                      </div>

                      <button
                        onClick={handleNextChapter}
                        disabled={selectedChapter >= selectedBook.chapters}
                        className={`p-1 sm:p-1.5 rounded-md sm:rounded-lg transition-all duration-200 ${
                          selectedChapter >= selectedBook.chapters
                            ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800'
                        }`}
                      >
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barre d'action — desktop/tablette */}
          {selectedVerses.length > 0 && (
            <div className={`hidden sm:flex mb-4 rounded-lg p-3 items-center justify-between ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'} shadow`}>
              <div className="text-sm">
                {state.settings.language === 'fr'
                  ? `${selectedVerses.length} verset${selectedVerses.length > 1 ? 's' : ''} sélectionné${selectedVerses.length > 1 ? 's' : ''}`
                  : `${selectedVerses.length} verse${selectedVerses.length > 1 ? 's' : ''} selected`}
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={copySelection} className="inline-flex items-center px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500">
                  <CopyIcon size={16} className="mr-2" />
                  {state.settings.language === 'fr' ? 'Copier la sélection' : 'Copy selection'}
                </button>
                <button onClick={() => setSelectedVerses([])} className={`${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'} px-3 py-2 rounded hover:opacity-90`}>
                  {state.settings.language === 'fr' ? 'Annuler' : 'Clear'}
                </button>
              </div>
            </div>
          )}

          {/* Contenu du chapitre */}
          {selectedBook && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 min-h-96`}>
              {/* Notification reprise */}
              {showRestoredNotification && (
                <div className={`mb-4 p-3 rounded-lg border-l-4 ${isDark ? 'bg-blue-900 border-blue-500 text-blue-200' : 'bg-blue-50 border-blue-500 text-blue-700'}`}>
                  <p className="text-sm flex items-center">
                    <BookOpen size={16} className="mr-2" />
                    {state.settings.language === 'fr' ? 'Vous avez repris votre lecture là où vous vous étiez arrêté' : 'You resumed reading where you left off'}
                    <button onClick={() => setShowRestoredNotification(false)} className={`ml-auto text-xs px-2 py-1 rounded ${isDark ? 'hover:bg-blue-800 text-blue-300' : 'hover:bg-blue-100 text-blue-600'}`}>
                      ✕
                    </button>
                  </p>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`} />
                  <span className={`ml-4 text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('loading')}</span>
                </div>
              ) : chapter ? (
                <div>
                  <h3 className={`text-xl font-semibold mb-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {getBookName(selectedBook!)} {t('chapter')} {chapter.chapter}
                  </h3>

                  {/* Resserre + fine ligne entre versets — avec bordure haute sur le 1er */}
                  <div className={`${isDark ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
                    {chapter.verses.map((v, idx) => {
                      const isHighlighted = highlightedVerse === v.verse;
                      const isSelected = selectedVerses.includes(v.verse);
                      const selectedBg = isSelected ? (isDark ? 'bg-blue-900/40 border-blue-500' : 'bg-blue-50 border-blue-400') : '';
                      const highlightBg = isHighlighted ? (isDark ? 'bg-yellow-900/30' : 'bg-yellow-50') : '';
                      const topBorder = idx === 0 ? (isDark ? 'border-t border-gray-700' : 'border-t border-gray-200') : '';

                      return (
                        <div
                          key={v.verse}
                          id={`verse-${v.verse}`}
                          onClick={() => toggleSelectVerse(v.verse)}
                          className={`relative cursor-pointer px-2 py-2 sm:py-3 transition-colors border-l-4 ${selectedBg} ${highlightBg} ${isSelected ? '' : 'border-transparent'} ${topBorder}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`w-8 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0 pt-0.5 flex items-center gap-1`}>
                              {v.verse}
                              {isSelected && <Check size={14} className={isDark ? 'text-blue-300' : 'text-blue-600'} />}
                            </span>

                            <div className="flex-1">
                              <div className={`${isDark ? 'text-gray-200' : 'text-gray-700'}`} style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.7' }}>
                                {isHighlighted && globalSearchTerm.trim()
                                  ? <span dangerouslySetInnerHTML={{ __html: highlightText(v.text, globalSearchTerm) }} />
                                  : v.text}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : selectedBook ? (
                <div className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p className="text-lg mb-2">{t('selectChapter')}</p>
                  <p className="text-sm">
                    {getBookName(selectedBook)} - {selectedBook.chapters} {t('chapter')}{selectedBook.chapters > 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <div className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Book size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">{t('selectBook')}</p>
                </div>
              )}
            </div>
          )}

          {/* Overlay Livres (désormais pour desktop ET mobile) */}
          {showBookPicker && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowBookPicker(false)} aria-hidden="true" />
              <div className={`absolute inset-0 ${isDark ? 'bg-gray-900' : 'bg-white'} p-4 overflow-y-auto`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {state.settings.language === 'fr' ? 'Choisir un livre' : 'Choose a book'}
                  </h3>
                  <button onClick={() => setShowBookPicker(false)} className={`${isDark ? 'text-gray-300 bg-gray-700' : 'text-gray-700 bg-gray-200'} px-3 py-1 rounded`}>
                    {state.settings.language === 'fr' ? 'Fermer' : 'Close'}
                  </button>
                </div>

                <div className="mb-6">
                  <h4 className={`text-sm uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('oldTestament')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {oldTestamentBooks.map(book => (
                      <button
                        key={`m-${book.name}`}
                        onClick={() => handleBookSelect(book)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedBook?.name === book.name
                          ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                          : isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {getBookName(book)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className={`text-sm uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('newTestament')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pb-10">
                    {newTestamentBooks.map(book => (
                      <button
                        key={`m-${book.name}`}
                        onClick={() => handleBookSelect(book)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedBook?.name === book.name
                          ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                          : isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {getBookName(book)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barre flottante (mobile) */}
          {selectedVerses.length > 0 && (
            <div className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
              <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'} shadow-lg rounded-full px-3 py-2 flex items-center space-x-2`}>
                <button onClick={copySelection} className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-600 text-white">
                  <CopyIcon size={16} className="mr-1" />
                  {state.settings.language === 'fr' ? 'Copier' : 'Copy'}
                </button>
                <button onClick={() => setSelectedVerses([])} className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-700'} px-3 py-1.5 rounded-full`}>
                  {state.settings.language === 'fr' ? 'Annuler' : 'Clear'}
                </button>
              </div>
            </div>
          )}

          {/* Toast Copié */}
          {copiedKey === 'selection' && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded text-sm shadow bg-green-600 text-white z-50">
              {state.settings.language === 'fr' ? 'Sélection copiée' : 'Selection copied'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


