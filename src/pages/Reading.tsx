import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { getBibleBooks, getChapter, copyToClipboard } from '../services/bibleService';
import { BibleBook, BibleChapter } from '../types/bible';
import {
  ChevronDown,
  Book,
  ChevronLeft,
  ChevronRight,
  Copy as CopyIcon,
  Check
} from 'lucide-react';

export default function Reading() {
  const { state, dispatch, saveReadingPosition } = useApp();
  const { t } = useTranslation();

  // Hauteur approximative de la barre de navigation (sticky)
  // Si ta nav change de hauteur, ajuste ici.
  const NAV_H = (typeof window !== 'undefined' && window.innerWidth < 640) ? 80 : 64;

  // Refs / mesures pour scroll précis
  const commandBarRef = useRef<HTMLDivElement>(null);
  const [cmdH, setCmdH] = useState(0);
  useEffect(() => {
    const compute = () => setCmdH(commandBarRef.current?.offsetHeight || 0);
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const [books] = useState<BibleBook[]>(getBibleBooks());
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapter, setChapter] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);

  // Mise en évidence (ex. depuis Recherche)
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);

  // Sélection au tap
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [copiedKey, setCopiedKey] = useState<string>('');

  // Sélecteur Livres (overlay)
  const [showBookPicker, setShowBookPicker] = useState<boolean>(false);

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
    setSelectedVerses([]);
    setHighlightedVerse(null);
    setShowBookPicker(false);
  };

  const handleChapterSelect = (chapterNum: number) => {
    setSelectedChapter(chapterNum);
    if (selectedBook) {
      fetchChapter(selectedBook, chapterNum);
      saveReadingPosition(selectedBook.name, chapterNum);
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

  // Helper pour FR/EN
  const getBookName = (book: BibleBook) => (state.settings.language === 'fr' ? book.nameFr : book.nameEn);

  // Helper pour résoudre un nom de livre (FR/EN/ID interne)
  const resolveBook = (bookIdentifier: string): BibleBook | null => {
    let found = books.find(b => b.name === bookIdentifier);
    if (found) return found;
    found = books.find(b => b.nameEn === bookIdentifier);
    if (found) return found;
    found = books.find(b => b.nameFr === bookIdentifier);
    if (found) return found;
    return null;
  };

  // Navigation contextuelle (depuis Search) — une seule fois au montage
  const [hasLoadedContext, setHasLoadedContext] = useState(false);
  useEffect(() => {
    if (!hasLoadedContext && state.readingContext && state.readingContext.book && state.readingContext.chapter > 0) {
      const book = resolveBook(state.readingContext.book);
      if (book) {
        setSelectedBook(book);
        setSelectedChapter(state.readingContext!.chapter);
        fetchChapter(book, state.readingContext!.chapter);
        setSelectedVerses([]);
        if (state.readingContext.verse) setHighlightedVerse(state.readingContext.verse);
        else setHighlightedVerse(null);
        setHasLoadedContext(true);
        // Réinitialiser le contexte après usage
        dispatch({ type: 'SET_READING_CONTEXT', payload: { book: '', chapter: 0 } });
      } else {
        dispatch({ type: 'SET_READING_CONTEXT', payload: { book: '', chapter: 0 } });
      }
    }
  }, [state.readingContext, books, hasLoadedContext, dispatch]);

  // Quand la langue change (recharge le chapitre courant)
  useEffect(() => {
    if (selectedBook && selectedChapter) {
      fetchChapter(selectedBook, selectedChapter);
      saveReadingPosition(selectedBook.name, selectedChapter);
    }
  }, [state.settings.language]);

  // Chargement initial si pas de contexte
  useEffect(() => {
    if (state.readingContext && state.readingContext.book && state.readingContext.chapter > 0) return;

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

  // Scroll + surbrillance (20s) — centrage fiable
  const stickyOffset = NAV_H + cmdH + 12; // marge de confort
  useEffect(() => {
    if (highlightedVerse !== null && chapter) {
      const id = `verse-${highlightedVerse}`;
      const timer = setTimeout(() => {
        const el = document.getElementById(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const current = window.scrollY || document.documentElement.scrollTop || 0;
        const target = current + rect.top - (NAV_H + cmdH) - 8;
        window.scrollTo({ top: Math.max(target, 0), behavior: 'smooth' });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [chapter, highlightedVerse, NAV_H, cmdH]);

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
    // ⚠️ On n’ajoute le numéro de verset qu’une seule fois (ici), et la pastille à gauche est non-sélectionnable.
    const body = chosen.map(v => `${v.verse}. ${v.text}`).join('\n');
    const payload = `${ref}\n${body}`;

    const ok = await copyToClipboard(payload);
    if (ok) {
      setCopiedKey('selection');
      setTimeout(() => setCopiedKey(''), 1500);
      setSelectedVerses([]);
    }
  };

  // ===== Gestes swipe (mobile & desktop touch)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50; // px

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // on peut ignorer ici, on décide à la fin
  };

  const onTouchEnd = () => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = (window as any).__lastTouchX === undefined ? 0 : (window as any).__lastTouchX - touchStartX.current;
    const dy = (window as any).__lastTouchY === undefined ? 0 : (window as any).__lastTouchY - touchStartY.current;

    // Swipe surtout horizontal
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) {
        // vers la gauche -> chapitre précédent
        handlePreviousChapter();
      } else if (dx > 0) {
        // vers la droite -> chapitre suivant
        handleNextChapter();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    (window as any).__lastTouchX = undefined;
    (window as any).__lastTouchY = undefined;
  };

  // Enregistre la dernière position touch pendant le déplacement
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      (window as any).__lastTouchX = e.touches[0]?.clientX;
      (window as any).__lastTouchY = e.touches[0]?.clientY;
    };
    window.addEventListener('touchmove', handler, { passive: true });
    return () => window.removeEventListener('touchmove', handler as any);
  }, []);

  // Hint (une fois par session)
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  useEffect(() => {
    const key = 'twog:hint:reading:shown';
    if (!sessionStorage.getItem(key)) {
      setShowSwipeHint(true);
      const t = setTimeout(() => {
        setShowSwipeHint(false);
        try { sessionStorage.setItem(key, '1'); } catch {}
      }, 2400);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div
      className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Bandeau commandes (Livres + chapitre) — sticky sous la nav */}
      {selectedBook && (
        <div
          ref={commandBarRef}
          className="sticky z-30 bg-transparent"
          style={{ top: `${NAV_H}px` }}
        >
          <div className={`${isDark ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur rounded-md sm:rounded-lg shadow-lg p-2 sm:p-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <h2 className={`text-base sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {getBookName(selectedBook)} — {t('chapter')} {selectedChapter}
              </h2>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* BOUTON LIVRES */}
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
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {selectedVerses.length > 0 && (
            <div className={`hidden sm:flex my-3 rounded-lg p-3 items-center justify-between ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'} shadow`}>
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
        </div>
      </div>

      {/* Contenu du chapitre */}
      {selectedBook && (
        <div className="container mx-auto px-4 pb-6">
          <div className="max-w-6xl mx-auto">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 min-h-96`}>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`} />
                  <span className={`ml-4 text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('loading')}</span>
                </div>
              ) : chapter ? (
                <div>
                  {/* Ligne de séparation générale entre versets */}
                  <div className={`${isDark ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
                    {chapter.verses.map((v, idx) => {
                      const isHighlighted = highlightedVerse === v.verse;
                      const isSelected = selectedVerses.includes(v.verse);

                      const selectedBg = isSelected ? (isDark ? 'bg-blue-900/40' : 'bg-blue-50') : '';
                      const highlightBg = isHighlighted ? (isDark ? 'bg-yellow-900/30' : 'bg-yellow-50') : '';

                      // Bordure fine en haut du verset 1
                      const firstVerseBorder = idx === 0
                        ? (isDark ? 'border-t border-t-gray-700' : 'border-t border-t-gray-200')
                        : '';

                      // Bordure gauche fine par défaut, et bleue/épaisse si sélectionné
                      const leftBorder = isSelected
                        ? 'border-l-4 border-blue-500'
                        : (isDark ? 'border-l border-gray-700' : 'border-l border-gray-200');

                      return (
                        <div
                          key={v.verse}
                          id={`verse-${v.verse}`}
                          onClick={() => toggleSelectVerse(v.verse)}
                          style={{ scrollMarginTop: stickyOffset }}
                          className={`relative cursor-pointer px-2 py-2 sm:py-3 transition-colors ${leftBorder} ${selectedBg} ${highlightBg} ${firstVerseBorder}`}
                        >
                          <div className="flex items-start gap-3 select-text">
                            <span className={`w-8 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0 pt-0.5 flex items-center gap-1 select-none`}>
                              {v.verse}
                              {isSelected && <Check size={14} className={isDark ? 'text-blue-300' : 'text-blue-600'} />}
                            </span>

                            <div className="flex-1">
                              <div className={`${isDark ? 'text-gray-200' : 'text-gray-700'}`} style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.7' }}>
                                {v.text}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Book size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">{t('selectBook')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlay Livres (desktop + mobile) */}
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
                {books.filter(b => b.testament === 'old').map(book => (
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
                {books.filter(b => b.testament === 'new').map(book => (
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

      {/* Hint swipe — centré, très visible, 1x par session */}
      {showSwipeHint && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="px-4 py-3 rounded-2xl text-base font-bold shadow-2xl ring-2 ring-white/80 bg-black/90 text-white animate-pulse">
            ◀ Glissez / Swipe ▶
            <div className="text-xs font-normal opacity-90 mt-1 text-center">
              {state.settings.language === 'fr'
                ? 'pour changer de chapitre'
                : 'to change chapter'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

