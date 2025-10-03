import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { getRandomVerse, copyToClipboard, warmBibleCache } from '../services/bibleService';
import { BibleVerse } from '../types/bible';
import { RefreshCw, Copy, Check } from 'lucide-react';

export default function Home() {
  const { state, navigateToVerse } = useApp();
  const { t } = useTranslation();
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isDark = state.settings.theme === 'dark';

  const fetchRandomVerse = async () => {
    setLoading(true);
    try {
      const randomVerse = await getRandomVerse(state.settings.language);
      setVerse(randomVerse);
    } catch (error) {
      console.error('Error fetching verse:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerseClick = () => {
    if (verse) {
      navigateToVerse(verse.book, verse.chapter, verse.verse);
    }
  };

  const handleCopyVerse = async () => {
    if (!verse) return;
    const text = `${verse.text}\n\n— ${verse.reference}`;
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    // Pré-chauffage (idempotent) + chargement du verset aléatoire
    warmBibleCache(state.settings.language);
    fetchRandomVerse();
  }, [state.settings.language]);

  // Clic sur la citation fixe -> ouvrir la lecture de Jérémie 23
  const openJeremiah23 = () => {
    // utiliser l'identifiant interne anglais du livre
    navigateToVerse('Jeremiah', 23);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} transition-colors duration-200`}>
      <div className="container mx-auto px-4 py-8 md:py-10">
        <div className="max-w-4xl mx-auto">
          {/* Carte du verset */}
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-2xl border p-6 md:p-10 transition-all duration-300 hover:shadow-3xl`}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`} />
                <span className={`ml-4 text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('loading')}
                </span>
              </div>
            ) : verse ? (
              <div className="text-center">
                <blockquote
                  onClick={handleVerseClick}
                  className={`text-lg md:text-xl leading-relaxed mb-8 italic cursor-pointer transition-all duration-200 hover:scale-105 ${isDark ? 'text-gray-200 hover:text-blue-300' : 'text-gray-700 hover:text-blue-600'}`}
                  style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.8' }}
                >
                  "{verse.text}"
                </blockquote>
                <cite
                  onClick={handleVerseClick}
                  className={`text-base font-medium cursor-pointer transition-all duration-200 hover:underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  — {verse.reference}
                </cite>
              </div>
            ) : (
              <div className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('error')}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-4 mt-12 justify-center">
              <button
                onClick={fetchRandomVerse}
                disabled={loading}
                className={`flex items-center justify-center space-x-3 px-8 py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                <span>{t('newVerse')}</span>
              </button>

              <button
                onClick={handleCopyVerse}
                disabled={!verse || loading}
                className={`flex items-center justify-center space-x-3 px-8 py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                  isDark
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                } ${(!verse || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
                <span>{copied ? t('verseCopied') : t('copyVerse')}</span>
              </button>
            </div>
          </div>

          {/* Citation fixe (cliquable) */}
          <div className="text-center mt-12">
            <button
              onClick={openJeremiah23}
              className="mx-auto block focus:outline-none"
              aria-label={state.settings.language === 'fr'
                ? 'Ouvrir Jérémie 23'
                : 'Open Jeremiah 23'}
              title={state.settings.language === 'fr'
                ? 'Ouvrir Jérémie 23'
                : 'Open Jeremiah 23'}
            >
              <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'} italic hover:underline`}>
                {state.settings.language === 'fr'
                  ? '« Ma parole n’est-elle pas comme un feu, dit l’Éternel, et comme un marteau qui brise le roc ? » — Jérémie 23:29'
                  : '“Is not my word like as a fire? saith the LORD; and like a hammer that breaketh the rock in pieces?” — Jeremiah 23:29'}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
