import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { Book, Globe, Music, ExternalLink, Heart, Shuffle } from 'lucide-react';

export default function About() {
  const { state } = useApp();
  const { t } = useTranslation();

  const isDark = state.settings.theme === 'dark';

  // Titre conditionnel : caché si vide OU s'il vaut la clé "aboutTitle"
  const rawTitle = (t('aboutTitle') ?? '').trim();
  const showTitle =
    rawTitle.length > 0 &&
    rawTitle !== 'aboutTitle' &&
    rawTitle.toLowerCase() !== 'abouttitle';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            {showTitle && (
              <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {rawTitle}
              </h1>
            )}
            <p className={`text-xl ${isDark ? 'text-gray-300' : 'text-gray-600'} max-w-3xl mx-auto leading-relaxed`}>
              {t('aboutDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Bible Versions */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8`}>
              <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <Book size={28} className="mr-3 text-blue-500" />
                {t('bibleVersions')}
              </h2>

              <div className="space-y-6">
                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-blue-50'} rounded-lg`}>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🇫🇷</span>
                    <div>
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Français</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                        {t('frenchVersion')}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                        {state.settings.language === 'fr'
                          ? 'Version de référence pour la Bible en français, traduite par Louis Segond en 1910.'
                          : 'Reference version for the Bible in French, translated by Louis Segond in 1910.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-4 ${isDark ? 'bg-gray-700' : 'bg-green-50'} rounded-lg`}>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🇺🇸</span>
                    <div>
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>English</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                        {t('englishVersion')}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                        {state.settings.language === 'fr'
                          ? 'Version classique de la Bible en anglais, publiée en 1611 et révisée en 1769.'
                          : 'Classic version of the Bible in English, published in 1611 and revised in 1769.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Random Feature */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8`}>
              <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <Shuffle size={28} className="mr-3 text-green-500" />
                {t('randomFeature')}
              </h2>

              <div className={`p-6 ${isDark ? 'bg-gray-700' : 'bg-gradient-to-br from-green-50 to-blue-50'} rounded-lg`}>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-4`}>
                  {t('randomFeatureDesc')}
                </p>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>31,000+</div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {state.settings.language === 'fr' ? 'Versets' : 'Verses'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>66</div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {state.settings.language === 'fr' ? 'Livres' : 'Books'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* ChercherDieu.com Link */}
            <div className={`${isDark ? 'bg-gradient-to-r from-blue-900 to-indigo-900' : 'bg-gradient-to-r from-blue-100 to-indigo-100'} rounded-xl shadow-lg p-6 text-center`}>
              <div className="flex items-center justify-center mb-4">
                <Book size={28} className={`mr-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {state.settings.language === 'fr' ? 'Études Bibliques' : 'Bible Studies'}
                </h3>
              </div>

              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
                {state.settings.language === 'fr'
                  ? 'Approfondissez votre foi avec des études bibliques détaillées.'
                  : 'Deepen your faith with detailed Bible studies.'}
              </p>

              <a
                href="https://www.chercherDieu.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
                  isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                <Globe size={18} />
                <span>chercherDieu.com</span>
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Instagram TrouverDieu Link */}
            <div className={`${isDark ? 'bg-gradient-to-r from-pink-900 to-rose-900' : 'bg-gradient-to-r from-pink-100 to-rose-100'} rounded-xl shadow-lg p-6 text-center`}>
              <div className="flex items-center justify-center mb-4">
                <Heart size={28} className={`mr-3 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {state.settings.language === 'fr' ? 'Inspiration Quotidienne Instagram' : 'Daily Inspiration Instagram'}
                </h3>
              </div>

              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
                {state.settings.language === 'fr'
                  ? 'Suivez-nous pour des versets et réflexions spirituelles quotidiennes.'
                  : 'Follow us for daily verses and spiritual reflections.'}
              </p>

              <a
                href="https://www.instagram.com/trouverdieu?utm_source=qr&igsh=Zjk1aDFzcjJ4cmtn"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
                  isDark ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg hover:shadow-xl' : 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                <Heart size={18} />
                <span>@trouverdieu</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Creator Music Link */}
          <div className={`${isDark ? 'bg-gradient-to-r from-purple-900 to-blue-900' : 'bg-gradient-to-r from-purple-100 to-blue-100'} rounded-xl shadow-lg p-8 text-center mb-8`}>
            <div className="flex items-center justify-center mb-4">
              <Music size={32} className={`mr-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{t('musicLink')}</h2>
            </div>

            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-6 text-lg`}>
              {state.settings.language === 'fr'
                ? 'Découvrez l\'univers musical spirituel du créateur sur Instagram.'
                : 'Discover the spiritual musical universe of the creator on Instagram.'}
            </p>

            <a
              href="https://www.instagram.com/jnsp.music?utm_source=qr&igsh=aTJkajM0OWxmMGc5"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center space-x-3 px-8 py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                isDark ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              <Music size={20} />
              <span>{state.settings.language === 'fr' ? 'Suivre @jnsp.music' : 'Follow @jnsp.music'}</span>
              <ExternalLink size={16} />
            </a>
          </div>

          {/* Footer */}
          <div className="text-center mt-12">
            <div className={`flex items-center justify-center mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
              <Heart size={20} className="mr-2" />
              <span className="font-medium">
                {state.settings.language === 'fr' ? 'Créé avec amour pour répandre la Parole de Dieu' : 'Created with love to spread God\'s Word'}
              </span>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {state.settings.language === 'fr'
                ? 'Toutes les versions bibliques utilisées sont dans le domaine public.'
                : 'All Bible versions used are in the public domain.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
