import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { getBibleBooks, getChapter } from '../services/bibleService';
import { BibleBook, BibleChapter } from '../types/bible';
import { ChevronDown, Book, Hash } from 'lucide-react';

export default function Reading() {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const [books] = useState<BibleBook[]>(getBibleBooks());
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapter, setChapter] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);

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
    setChapter(null);
  };

  const handleChapterSelect = (chapterNum: number) => {
    setSelectedChapter(chapterNum);
    if (selectedBook) {
      fetchChapter(selectedBook, chapterNum);
    }
  };

  const oldTestamentBooks = books.filter(book => book.testament === 'old');
  const newTestamentBooks = books.filter(book => book.testament === 'new');

  const getBookName = (book: BibleBook) => {
    return state.settings.language === 'fr' ? book.nameFr : book.nameEn;
  };

  // Handle navigation from verse click
  useEffect(() => {
    if (state.readingContext) {
      const book = books.find(b => b.name === state.readingContext!.book);
      if (book) {
        setSelectedBook(book);
        setSelectedChapter(state.readingContext!.chapter);
        fetchChapter(book, state.readingContext!.chapter);
        // Clear the reading context after using it
        dispatch({ type: 'SET_READING_CONTEXT', payload: { book: '', chapter: 0 } });
      }
    }
  }, [state.readingContext, books, dispatch]);
  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {t('reading')}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Book Selection Sidebar */}
            <div className={`lg:col-span-1 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <Book size={20} className="mr-2" />
                {t('selectBook')}
              </h2>

              {/* Old Testament */}
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

              {/* New Testament */}
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

            {/* Content Area */}
            <div className="lg:col-span-3">
              {selectedBook && (
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                    <h2 className={`text-2xl font-bold mb-4 sm:mb-0 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {getBookName(selectedBook)}
                    </h2>
                    
                    {/* Chapter Selection */}
                    <div className="flex items-center space-x-4">
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} flex items-center`}>
                        <Hash size={16} className="mr-1" />
                        {t('chapter')}:
                      </label>
                      <div className="relative">
                        <select
                          value={selectedChapter}
                          onChange={(e) => handleChapterSelect(Number(e.target.value))}
                          className={`appearance-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
                        >
                          {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={num}>
                              {num}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-600'} pointer-events-none`} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter Content */}
              <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 min-h-96`}>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`}></div>
                    <span className={`ml-4 text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {t('loading')}
                    </span>
                  </div>
                ) : chapter ? (
                  <div>
                    <h3 className={`text-xl font-semibold mb-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {getBookName(selectedBook!)} {t('chapter')} {chapter.chapter}
                    </h3>
                    <div className="space-y-4">
                      {chapter.verses.map((verse) => (
                        <div key={verse.verse} className="flex">
                          <span className={`inline-block w-8 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`}>
                            {verse.verse}
                          </span>
                          <p 
                            className={`${isDark ? 'text-gray-200' : 'text-gray-700'} leading-relaxed`}
                            style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.7' }}
                          >
                            {verse.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedBook ? (
                  <div className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p className="text-lg mb-2">{t('selectChapter')}</p>
                    <p className="text-sm">{getBookName(selectedBook)} - {selectedBook.chapters} {t('chapter')}{selectedBook.chapters > 1 ? 's' : ''}</p>
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