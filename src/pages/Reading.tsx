// src/pages/Reading.tsx
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
  Check,
  Search as SearchIcon,
} from 'lucide-react';
import {
  readSlot as readQuickSlot,
  saveSlot as saveQuickSlot,
  type QuickSlot,
} from '../services/readingSlots';

export default function Reading() {
  const { state, dispatch, saveReadingPosition } = useApp();
  const { t } = useTranslation();

  // Hauteur de la nav principale (bandeau du site)
  const NAV_H = 64;

  // Hauteur dynamique du bandeau commandes (mesurée)
  const commandBarRef = useRef<HTMLDivElement>(null);
  const [cmdH, setCmdH] = useState(0);
  useEffect(() => {
    const compute = () => setCmdH(commandBarRef.current?.offsetHeight || 0);
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const [books] = useState(getBibleBooks());
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapter, setChapter] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);

  // Mise en évidence (depuis la page Recherche)
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);

  // Sélection au tap
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [copiedKey, setCopiedKey] = useState<string>('');

  // Overlays
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);

  // Hint swipe (une seule fois par session)
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  useEffect(() => {
    const key = `twog:hint:swipe:v3:${state.settings.language}`;
    if (!sessionStorage.getItem(key)) {
      setShowSwipeHint(true);
      sessionStorage.setItem(key, '1');
      const timer = setTimeout(() => setShowSwipeHint(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [state.settings.language]);

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
    setSelectedVerses([]);
    setHighlightedVerse(null);
    setShowBookPicker(false);
    fetchChapter(book, 1);
    saveReadingPosition(book.name, 1);
    try { window.scrollTo({ top: 0 }); } catch {}
  };

  const handleChapterSelect = (chapterNum: number) => {
    setSelectedChapter(chapterNum);
    if (selectedBook) {
      setSelectedVerses([]);
      setHighlightedVerse(null);
      try { window.scrollTo({ top: 0 }); } catch {}
      fetchChapter(selectedBook, chapterNum);
      saveReadingPosition(selectedBook.name, chapterNum);
    }
  };

  const handlePreviousChapter = () => {
    if (selectedBook && selectedChapter > 1) handleChapterSelect(selectedChapter - 1);
  };
  const handleNextChapter = () => {
    if (selectedBook && selectedChapter < selectedBook.chapters) handleChapterSelect(selectedChapter + 1);
  };

  const oldTestamentBooks = books.filter(book => book.testament === 'old');
  const newTestamentBooks = books.filter(book => book.testament === 'new');
  const getBookName = (book: BibleBook) => (state.settings.language === 'fr' ? book.nameFr : book.nameEn);

  // Helper pour résoudre un nom de livre
  const resolveBook = (bookIdentifier: string): BibleBook | null => {
    let found = books.find(b => b.name === bookIdentifier);
    if (found) return found;
    found = books.find(b => b.nameEn === bookIdentifier);
    if (found) return found;
    found = books.find(b => b.nameFr === bookIdentifier);
    if (found) return found;
    return null;
  };

  // Navigation contextuelle - une fois au montage
  const [hasLoadedContext, setHasLoadedContext] = useState(false);
  useEffect(() => {
    if (!hasLoadedContext && state.readingContext && state.readingContext.book && state.readingContext.chapter > 0) {
      const book = resolveBook(state.readingContext.book);
      if (book) {
        setSelectedBook(book);
        setSelectedChapter(state.readingContext.chapter);
        fetchChapter(book, state.readingContext.chapter);
        setSelectedVerses([]);
        if (state.readingContext.verse) setHighlightedVerse(state.readingContext.verse);
        setHasLoadedContext(true);
        dispatch({ type: 'SET_READING_CONTEXT', payload: { book: '', chapter: 0 } });
      } else {
        dispatch({ type: 'SET_READING_CONTEXT', payload: { book: '', chapter: 0 } });
      }
    }
  }, [state.readingContext, books, hasLoadedContext, dispatch]);

  // Quand la langue change
  useEffect(() => {
    if (selectedBook && selectedChapter) {
      fetchChapter(selectedBook, selectedChapter);
      saveReadingPosition(selectedBook.name, selectedChapter);
    }
  }, [state.settings.language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chargement initial (si pas de contexte)
  useEffect(() => {
    if (state.readingContext && state.readingContext.book && state.readingContext.chapter > 0) return;

    if (!selectedBook) {
      const matthewBook = resolveBook('Matthew');
      if (matthewBook) {
        setSelectedBook(matthewBook);
        setSelectedChapter(1);
        fetchChapter(matthewBook, 1);
        try { window.scrollTo({ top: 0 }); } catch {}
      }
    }
  }, [books, selectedBook, state.readingContext]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll + surbrillance (20s) quand on vient d'une recherche
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

  // Compactage de plages
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
      else { push(); start = n; prev = n; }
    }
    push();
    return parts.join(',');
  };

  // Copie sélection
  const copySelection = async () => {
    if (!selectedBook || !chapter || selectedVerses.length === 0) return;
    const chosen = chapter.verses
      .filter(v => selectedVerses.includes(v.verse))
      .sort((a, b) => a.verse - b.verse);

    const ranges = compressRanges(chosen.map(v => v.verse));
    const ref = `${getBookName(selectedBook)} ${chapter.chapter}:${ranges}`;
    const body = chosen.map(v => `${v.text}`).join('\n');

    const payload = `${ref}\n${body}`;

    const ok = await copyToClipboard(payload);
    if (ok) {
      setCopiedKey('selection');
      setTimeout(() => setCopiedKey(''), 1500);
      setSelectedVerses([]);
    }
  };

  // Swipe chapitres (mobile)
  const swipeStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeHandled = useRef(false);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    swipeHandled.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart.current || swipeHandled.current || loading || !selectedBook) return;
    const t = e.touches[0];
    const dx = t.clientX - swipeStart.current.x;
    const dy = t.clientY - swipeStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx > 60 && absDx > absDy * 1.4) {
      swipeHandled.current = true;
      if (dx < 0) {
        if (selectedBook && selectedChapter < selectedBook.chapters) handleNextChapter();
      } else {
        if (selectedChapter > 1) handlePreviousChapter();
      }
    }
  };
  const onTouchEnd = () => { swipeStart.current = null; swipeHandled.current = false; };

  // Offset sticky total pour "scroll-margin"
  const stickyOffset = NAV_H + cmdH + 12;

  /* =========================
     Quick Slots (MOBILE FIRST)
     ========================= */
  const [quickSlots, setQuickSlots] = useState<QuickSlot[]>([null, null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null); // 1/2/3 suivi auto ; 0=search (désactivé)

  function readAllSlots(): QuickSlot[] {
    return [0, 1, 2, 3].map(i => readQuickSlot(i));
  }
  function refreshSlots() {
    try { setQuickSlots(readAllSlots()); } catch {}
  }
  useEffect(() => { refreshSlots(); }, []);

  // Persiste automatiquement la position courante dans le slot actif (1/2/3)
  useEffect(() => {
    if (!selectedBook) return;
    if (activeSlot !== null && activeSlot !== 0) {
      try {
        saveQuickSlot(activeSlot, { book: selectedBook.name, chapter: selectedChapter });
        refreshSlots();
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBook?.name, selectedChapter, activeSlot]);

  function jumpToSlot(i: number) {
    const slot = readQuickSlot(i);

    if (i === 0) {
      // Loupe = désactiver le suivi auto pour ne jamais écraser 1/2/3
      setActiveSlot(null);
      if (!slot) return;
      const b = resolveBook(slot.book);
      if (!b) return;
      setSelectedBook(b);
      setSelectedChapter(slot.chapter);
      setSelectedVerses([]);
      setHighlightedVerse(slot.verse ?? null);
      try { window.scrollTo({ top: 0 }); } catch {}
      fetchChapter(b, slot.chapter);
      saveReadingPosition(b.name, slot.chapter);
      return;
    }

    // Slots 1/2/3 => deviennent ACTIFS
    setActiveSlot(i);

    // Si vide : mémorise l'emplacement courant
    if (!slot) {
      if (!selectedBook) return;
      saveQuickSlot(i, { book: selectedBook.name, chapter: selectedChapter });
      refreshSlots();
      return;
    }

    // Sinon : sauter à la position mémorisée
    const book = resolveBook(slot.book);
    if (!book) return;
    setSelectedBook(book);
    setSelectedChapter(slot.chapter);
    setSelectedVerses([]);
    setHighlightedVerse(slot.verse ?? null);
    try { window.scrollTo({ top: 0 }); } catch {}
    fetchChapter(book, slot.chapter);
    saveReadingPosition(book.name, slot.chapter);
  }

  // Rendu bouton slot (mobile)
  const renderSlotBtn = (i: number) => {
    const s = quickSlots[i];
    const filled = s !== null;

    const base = 'px-3 py-1.5 rounded-full text-xs font-semibold shadow active:scale-95 inline-flex items-center gap-1';
    let cls = '';
    if (i === 0) {
      // Loupe (recherche) — fond blanc/bordure indigo
      cls = isDark
        ? `border border-indigo-400/60 text-indigo-200`
        : `bg-white border border-indigo-300 text-indigo-700`;
    } else {
      cls = filled
        ? 'bg-blue-600 text-white'
        : (isDark ? 'bg-gray-800 text-gray-200 border border-gray-600' : 'bg-white text-gray-800 border border-gray-300');
      if (activeSlot === i) cls += ' ring-2 ring-offset-1 ring-blue-400';
    }

    const title =
      i === 0
        ? (s ? `Recherche : ${s.book} ${s.chapter}${s.verse ? ':' + s.verse : ''}` : 'Recherche (vide)')
        : (s ? `Mémoire ${i} : ${s.book} ${s.chapter}` : `Mémoire ${i} (vide)`);

    return (
      <button
        key={`qs-${i}`}
        className={`${base} ${cls}`}
        onClick={() => jumpToSlot(i)}
        aria-label={title}
        title={title}
      >
        {i === 0 ? <SearchIcon className="w-4 h-4" /> : <span>{i}</span>}
      </button>
    );
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      {/* Contenu principal */}
      <div className="container mx-auto px-4 pb-6">
        <div
          className="max-w-6xl mx-auto"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'manipulation' }}
        >
          {/* Bandeau sticky (livre + chapitre + quick-slots mobile sur la même ligne) */}
          {selectedBook && (
            <div
              ref={commandBarRef}
              className="sticky z-30 bg-transparent"
              style={{ top: `${NAV_H}px` }}
            >
              <div className={`${isDark ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur rounded-md shadow md:rounded-lg md:shadow-lg px-3 py-2 md:p-3 mb-2`}>
                <div className="flex items-center gap-2">
                  {/* Titre : sur mobile, les 2 boutons bleus */}
                  <h2 className={`truncate font-semibold ${isDark ? 'text-white' : 'text-gray-800'} text-sm md:text-base flex items-center gap-2`}>
                    {/* Mobile : Livre */}
                    <button
                      type="button"
                      onClick={() => setShowBookPicker(true)}
                      aria-expanded={showBookPicker}
                      className="md:hidden inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold bg-blue-600 text-white shadow hover:bg-blue-500 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 truncate max-w-[50vw]"
                      title={state.settings.language === 'fr' ? 'Choisir un livre' : 'Choose a book'}
                      aria-label={state.settings.language === 'fr' ? 'Choisir un livre' : 'Choose a book'}
                    >
                      {getBookName(selectedBook)}
                      <ChevronDown className="w-3 h-3 opacity-90" />
                    </button>

                    {/* Desktop : nom du livre */}
                    <span className="hidden md:inline truncate">
                      {getBookName(selectedBook)} •
                    </span>

                    {/* Mobile : Chapitre */}
                    <button
                      type="button"
                      onClick={() => setShowChapterPicker(true)}
                      aria-expanded={showChapterPicker}
                      className="md:hidden inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold bg-blue-600 text-white shadow hover:bg-blue-500 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      title={state.settings.language === 'fr' ? 'Choisir un chapitre' : 'Choose a chapter'}
                      aria-label={state.settings.language === 'fr' ? 'Choisir un chapitre' : 'Choose a chapter'}
                    >
                      {t('chapter')} {selectedChapter}
                      <ChevronDown className="w-3 h-3 opacity-90" />
                    </button>

                    {/* Desktop : "Chapitre N" en texte */}
                    <span className="hidden md:inline">
                      {t('chapter')} {selectedChapter}
                    </span>
                  </h2>

                  {/* Quick-slots MOBILE à droite, sur la même ligne */}
                  <div className="md:hidden ml-auto flex items-center gap-2">
                    {[0, 1, 2, 3].map(renderSlotBtn)}
                  </div>

                  {/* Actions desktop */}
                  <div className="hidden md:flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setShowBookPicker(true)}
                      className={`px-3 py-1.5 rounded-md text-sm font-semibold shadow-sm ${
                        isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                    >
                      {state.settings.language === 'fr' ? 'Livres' : 'Books'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePreviousChapter}
                        disabled={selectedChapter <= 1}
                        className={`p-1.5 rounded-md transition-all ${
                          selectedChapter <= 1
                            ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800'
                        }`}
                        title={state.settings.language === 'fr' ? 'Chapitre précédent' : 'Previous chapter'}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="relative">
                        <select
                          value={selectedChapter}
                          onChange={(e) => handleChapterSelect(Number(e.target.value))}
                          className={`appearance-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-md px-3 py-1.5 pr-7 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                          title={state.settings.language === 'fr' ? 'Choisir chapitre' : 'Choose chapter'}
                        >
                          {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                        <ChevronDown className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                      </div>

                      <button
                        onClick={handleNextChapter}
                        disabled={selectedChapter >= selectedBook.chapters}
                        className={`p-1.5 rounded-md transition-all ${
                          selectedChapter >= selectedBook.chapters
                            ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800'
                        }`}
                        title={state.settings.language === 'fr' ? 'Chapitre suivant' : 'Next chapter'}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barre d'action — desktop/tablette (STICKY, pour copier) */}
          {selectedVerses.length > 0 && (
            <div
              className="hidden md:block sticky z-40 mb-3"
              style={{ top: `${NAV_H + cmdH + 8}px` }}
            >
              <div className={`${isDark ? 'bg-gray-800 text-gray-100 border border-gray-700' : 'bg-white text-gray-800 border border-gray-200'} rounded-lg shadow px-4 py-3 flex items-center justify-between`}>
                <div className="text-sm">
                  {state.settings.language === 'fr'
                    ? `${selectedVerses.length} verset${selectedVerses.length > 1 ? 's' : ''} sélectionné${selectedVerses.length > 1 ? 's' : ''}`
                    : `${selectedVerses.length} verse${selectedVerses.length > 1 ? 's' : ''} selected`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copySelection}
                    className="inline-flex items-center px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
                  >
                    <CopyIcon size={16} className="mr-2" />
                    {state.settings.language === 'fr' ? 'Copier la sélection' : 'Copy selection'}
                  </button>
                  <button
                    onClick={() => setSelectedVerses([])}
                    className={`${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'} px-3 py-2 rounded hover:opacity-90`}
                  >
                    {state.settings.language === 'fr' ? 'Annuler' : 'Clear'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contenu du chapitre */}
          {selectedBook && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} sm:rounded-xl sm:shadow-lg sm:p-6 p-3 -mx-4 sm:mx-0 min-h-96`}>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`} />
                  <span className={`ml-4 text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('loading')}</span>
                </div>
              ) : chapter ? (
                <div>
                  <div className={`${isDark ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
                    {chapter.verses.map((v, idx) => {
                      const isHighlighted = highlightedVerse === v.verse;
                      const isSelected = selectedVerses.includes(v.verse);

                      const selectedBg = isSelected ? (isDark ? 'bg-blue-900/40' : 'bg-blue-50') : '';
                      const highlightBg = isHighlighted ? (isDark ? 'bg-yellow-900/30' : 'bg-yellow-50') : '';

                      const firstVerseBorder = idx === 0
                        ? (isDark ? 'border-t border-gray-700' : 'border-t border-gray-200')
                        : '';

                      const leftBorder = isSelected
                        ? 'border-l-4 border-blue-500'
                        : (isDark ? 'border-l border-gray-700' : 'border-l border-gray-200');

                      return (
                        <div
                          key={v.verse}
                          id={`verse-${v.verse}`}
                          onClick={() => toggleSelectVerse(v.verse)}
                          style={{ scrollMarginTop: stickyOffset }}
                          className={`relative cursor-pointer px-3 pt-6 sm:pt-7 pb-2 sm:pb-3 transition-colors ${leftBorder} ${selectedBg} ${highlightBg} ${firstVerseBorder}`}
                        >
                          <span className={`absolute right-2 top-1 sm:top-2 text-xs sm:text-sm select-none pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {state.settings.language === 'fr' ? 'verset' : 'verse'} {v.verse}
                            {isSelected && (
                              <Check size={14} className={`inline ml-1 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                            )}
                          </span>

                          <div
                            className={`${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                            style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.7' }}
                          >
                            {v.text}
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

          {/* Overlay Livres */}
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

          {/* Overlay Chapitres */}
          {showChapterPicker && selectedBook && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowChapterPicker(false)} aria-hidden="true" />
              <div className={`absolute inset-0 ${isDark ? 'bg-gray-900' : 'bg-white'} p-4 overflow-y-auto`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {state.settings.language === 'fr' ? 'Choisir un chapitre' : 'Choose a chapter'}
                  </h3>
                  <button
                    onClick={() => setShowChapterPicker(false)}
                    className={`${isDark ? 'text-gray-300 bg-gray-700' : 'text-gray-700 bg-gray-200'} px-3 py-1 rounded`}
                  >
                    {state.settings.language === 'fr' ? 'Fermer' : 'Close'}
                  </button>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 pb-10">
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((num) => {
                    const active =
                      num === selectedChapter
                        ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800')
                        : (isDark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200');

                    return (
                      <button
                        key={`chap-${num}`}
                        onClick={() => { handleChapterSelect(num); setShowChapterPicker(false); }}
                        className={`h-10 rounded-lg text-sm font-medium ${active}`}
                        aria-current={num === selectedChapter ? 'page' : undefined}
                      >
                        {num}
                      </button>
                    );
                  })}
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

          {/* Hint swipe */}
          {showSwipeHint && (
            <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
              <div className="px-5 py-4 rounded-2xl text-base font-bold shadow-2xl ring-2 ring-white/90 bg-black/90 text-white animate-pulse">
                ◀ Glissez / Swipe ▶
                <div className="text-xs font-normal opacity-95 mt-1 text-center">
                  {state.settings.language === 'fr'
                    ? 'pour changer de chapitre'
                    : 'to change chapter'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

