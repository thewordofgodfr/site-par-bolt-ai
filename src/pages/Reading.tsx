import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { getBibleBooks, getChapter, searchInBible } from '../services/bibleService';
import { BibleBook, BibleChapter } from '../types/bible';
import { ChevronDown, Book, ChevronLeft, ChevronRight, Search, X, BookOpen } from 'lucide-react';
import { highlightText } from '../utils/searchUtils';

export default function Reading() {
  const { state, dispatch, saveReadingPosition } = useApp();
  const { t } = useTranslation();
  const [books] = useState<BibleBook[]>(getBibleBooks());
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapter, setChapter] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showRestoredNotification, setShowRestoredNotification] = useState(false);

  const isDark = state.settings.theme === 'dark';

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
  };

  const handleChapterSelect = (chapterNum: number) => {
    setSelectedChapter(chapterNum);
    if (selectedBook) {
      fetchChapter(selectedBook, chapterNum);
      saveReadingPosition(selectedBook.name, chapterNum);
      setShowRestoredNotification(false);
    }
  };

  const handlePreviousChapter = () => {
    if (selectedBook && selectedChapter > 1) {
      handleChapterSelect(selectedChapter - 1);
    }
  };

  const handleNextChapter = () => {
    if (selectedBook && selectedChapter < selectedBook.chapters) {
      handleChapterSelect(selectedChapter + 1);
    }
  };

  const handleGlobalSearch = async (term: string) => {
    setGlobalSearchTerm(term);

    if (!term.trim()) {
      setGlobalSearchResults([]);
      setShowGlobalSearch(false);
      return;
    }

    setSearchLoading(true);
    setShowGlobalSearch(true);

    try {
      const results = await searchInBible(term, state.settings.language);
      setGlobalSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setGlobalSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearGlobalSearch = () => {
    setGlobalSearchTerm('');
    setGlobalSearchResults([]);
    setShowGlobalSearch(false);
  };

  const handleVerseClick = (book: string, chapter: number) => {
    const bookObj = books.find(b => b.name === book);
    if (bookObj) {
      setSelectedBook(bookObj);
      setSelectedChapter(chapter);
      fetchChapter(bookObj, chapter);
      setShowGlobalSearch(false);
      saveReadingPosition(book, chapter);
    }
  };

  const oldTestamentBooks = books.filter(book => book.testament === 'old');
  const newTestamentBooks = books.filter(book => book.testament === 'new');

  const getBookName = (book: BibleBook) => {
    return state.settings.language === 'fr' ? book.nameFr : book.nameEn;
  };

  // Navigation depuis un clic sur un verset (depuis la recherche globale, etc.)
  useEffect(() => {
    if (state.readingContext) {
      const book = books.find(b => b.name === state.readingContext!.book);
      if (book) {
        setSelectedBook(book);
        setSelectedChapter(state.readingContext!.chapter);
        fetchChapter(book, state.readingContext!.chapter);
        dispatch({ type: 'SET_READING_CONTEXT', payload: { book: '', chapter: 0 } });
      }
    }
  }, [state.readingContext, books, dispatch]);

  /**
   * Quand la langue change :
   *  - on recharge le chapitre courant
   *  - on re-sauvegarde la position
   *  - on relance la recherche si elle est ouverte
   */
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
  }, [state.settings.language]); // eslint-disable-line

  // Chargement initial
  useEffect(() => {
    if (!selectedBook && !state.readingContext) {
      const lastPosition = state.settings.lastReadingPosition;

      if (lastPosition && lastPosition.timestamp) {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (lastPosition.timestamp > thirtyDaysAgo) {
          const savedBook = books.find(b => b.name === lastPosition.book);
          if (savedBook) {
            setSelectedBook(savedBook);
            setSelectedChapter(lastPosition.chapter);
            fetchChapter(savedBook, lastPosition.chapter);
            setShowRestoredNotification(true);
            return;
          }
        }
      }

      const matthewBook = books.find(b => b.name === 'Matthew');
      if (matthewBook) {
        setSelectedBook(matthewBook);
        setSelectedChapter(1);
        fetchChapter(matthewBook, 1);
      }
    }
  }, [books, selectedBook, state.readingContext]); // eslint-disable-line

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* En-tête */}
          <div className="text-center mb-2">
            <h1 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {t('reading')}
            </h1>
          </div>

          {/* Barre de recherche GLOBALE — sticky sous la navbar (64px) */}
          <div className="max-w-2xl mx-auto mt-2 mb-6 sticky top-[64px] z-40">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={20} className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <input
                type="text"
                value={globalSearchTerm}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                placeholder={state.settings.language === 'fr' ? 'Rechercher dans toute la Bible...' : 'Search in the entire Bible...'}
                className={`w-full pl-12 pr-12 py-4 rounded-xl border-2 text-lg transition-all duration-200 ${
                  isDark
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md`}
              />
              {globalSearchTerm && (
                <button
                  onClick={clearGlobalSearch}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  aria-label="Clear search"
                  title="Clear"
                >
                  <X size={20} className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} transition-colors duration-200`} />
                </button>
              )}
            </div>
          </div>

          {/* Résultats de recherche globale */}
          {showGlobalSearch && globalSearchResults.length > 0 && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <BookOpen size={20} className="mr-2" />
                {state.settings.language === 'fr' ? 'Résultats de recherche' : 'Search Results'}
              </h2>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {globalSearchResults.map((verse) => (
                  <div
                    key={`${verse.book}-${verse.chapter}-${verse.verse}`}
                    onClick={() => handleVerseClick(verse.book, verse.chapter)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{verse.reference}</span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {state.settings.language === 'fr' ? 'Cliquer pour aller au chapitre' : 'Click to go to chapter'}
                      </span>
                    </div>
                    <div
                      className={`${isDark ? 'text-gray-200' : 'text-gray-700'} leading-relaxed`}
                      style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.7' }}
                      dangerouslySetInnerHTML={{ __html: highlightText(verse.text, globalSearchTerm) }}
                    />
                  </div>
                ))}
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
          {showGlobalSearch && globalSearchResults.length === 0 && !searchLoading && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 mb-6 text-center`}>
              <Search size={48} className={`mx-auto mb-4 opacity-50 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {state.settings.language === 'fr' ? 'Aucun résultat trouvé' : 'No results found'}
              </h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                {state.settings.language === 'fr'
                  ? `Aucun verset trouvé pour "${globalSearchTerm}" dans la Bible`
                  : `No verses found for "${globalSearchTerm}" in the Bible`}
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

          <div className={`grid grid-cols-1 lg:grid-cols-4 gap-6 ${showGlobalSearch ? 'opacity-75' : ''}`}>
            {/* Liste des livres */}
            <div className={`lg:col-span-1 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <Book size={20} className="mr-2" />
                {t('selectBook')}
              </h2>

              {/* Ancien Testament */}
              <div className="mb-6">
                <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wide`}>
                  {t('oldTestament')}
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {oldTestamentBooks.map((book) => (
                    <button
                      key={book.name}
                      onClick={() => handleBookSelect(book)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        selectedBook?.name === book.name
                          ? isDark
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-800'
                          : isDark
                          ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                          : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      {getBookName(book)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nouveau Testament */}
              <div>
                <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wide`}>
                  {t('newTestament')}
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {newTestamentBooks.map((book) => (
                    <button
                      key={book.name}
                      onClick={() => handleBookSelect(book)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        selectedBook?.name === book.name
                          ? isDark
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-800'
                          : isDark
                          ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                          : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      {getBookName(book)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Zone de contenu */}
            <div className="lg:col-span-3">
              {selectedBook && (
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h2 className={`text-2xl font-bold mb-4 sm:mb-0 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {getBookName(selectedBook)}
                    </h2>

                    {/* Sélecteur de chapitre */}
                    <div className="flex items-center space-x-4">
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} flex items-center`}>
                        <span className="text-base font-semibold">{t('chapter')}:</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handlePreviousChapter}
                          disabled={selectedChapter <= 1}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            selectedChapter <= 1
                              ? isDark
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : isDark
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800'
                          }`}
                        >
                          <ChevronLeft size={16} />
                        </button>

                        <div className="relative">
                          <select
                            value={selectedChapter}
                            onChange={(e) => handleChapterSelect(Number(e.target.value))}
                            className={`appearance-none ${
                              isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            } border rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
                          >
                            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((num) => (
                              <option key={num} value={num}>
                                {num}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={16}
                            className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            } pointer-events-none`}
                          />
                        </div>

                        <button
                          onClick={handleNextChapter}
                          disabled={selectedChapter >= selectedBook.chapters}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            selectedChapter >= selectedBook.chapters
                              ? isDark
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : isDark
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800'
                          }`}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contenu du chapitre */}
              <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 min-h-96`}>
                {showRestoredNotification && (
                  <div
                    className={`mb-4 p-3 rounded-lg border-l-4 ${
                      isDark ? 'bg-blue-900 border-blue-500 text-blue-200' : 'bg-blue-50 border-blue-500 text-blue-700'
                    }`}
                  >
                    <p className="text-sm flex items-center">
                      <BookOpen size={16} className="mr-2" />
                      {state.settings.language === 'fr'
                        ? 'Vous avez repris votre lecture là où vous vous étiez arrêté'
                        : 'You resumed reading where you left off'}
                      <button
                        onClick={() => setShowRestoredNotification(false)}
                        className={`ml-auto text-xs px-2 py-1 rounded ${
                          isDark ? 'hover:bg-blue-800 text-blue-300' : 'hover:bg-blue-100 text-blue-600'
                        }`}
                      >
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
                    <div className="space-y-4">
                      {chapter.verses.map((verse) => (
                        <div key={verse.verse} className="flex">
                          <span className={`inline-block w-8 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`}>
                            {verse.verse}
                          </span>
                          <div
                            className={`${isDark ? 'text-gray-200' : 'text-gray-700'} leading-relaxed`}
                            style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.7' }}
                          >
                            {verse.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedBook ? (
                  <div className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p className="text-lg mb-2">{t('selectChapter')}</p>
                    <p className="text-sm">
                      {getBookName(selectedBook)} - {selectedBook.chapters} {t('chapter')}
                      {selectedBook.chapters > 1 ? 's' : ''}
                    </p>
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
        </div>
      </div>
    </div>
  );
}

