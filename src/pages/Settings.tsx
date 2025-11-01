// src/pages/Settings.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
import QuickSlotsHelp from '../components/QuickSlotsHelp';
import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { Globe, Palette, RefreshCcw } from 'lucide-react';

export default function Settings() {
  const { state, updateSettings } = useApp();
  const { t } = useTranslation();

  // Forcer le mode sombre au montage (sécurité globale)
  useEffect(() => {
    if (state.settings.theme !== 'dark') {
      updateSettings({ theme: 'dark' });
    }
  }, [state.settings.theme, updateSettings]);

  // UI forcée en sombre
  const isDark = true;

  // Nouvelles tailles (3 rangées, du plus petit au plus grand)
  const fontSizes = [21, 23, 25, 27, 29];

  // --- Gestion mise à jour (SW) ---
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'ready' | 'upToDate' | 'unavailable' | 'error'
  >('idle');
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onControllerChange = () => {
      // Quand le nouveau SW prend le contrôle -> rechargement propre
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  const handleCheckUpdates = async () => {
    if (!('serviceWorker' in navigator)) {
      setUpdateStatus('unavailable');
      return;
    }
    try {
      setUpdateStatus('checking');
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setUpdateStatus('unavailable');
        return;
      }

      const previousWaiting = reg.waiting || null;

      await reg.update(); // force un check de MAJ

      // Petite fenêtre pour laisser le SW se télécharger/installer s'il existe
      setTimeout(() => {
        if (reg.waiting && reg.waiting !== previousWaiting) {
          setWaitingSW(reg.waiting);
          setUpdateStatus('ready');
        } else {
          // Pas de worker en attente détecté, on considère à jour
          setUpdateStatus('upToDate');
        }
      }, 800);
    } catch {
      setUpdateStatus('error');
    }
  };

  const applyUpdate = () => {
    if (waitingSW) {
      // Demande au SW d'activer tout de suite (si implémenté côté SW)
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
      // Si le SW ne traite pas ce message, on force un reload de secours
      setTimeout(() => window.location.reload(), 1200);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {t('settings')}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Apparence (sombre forcé) + Taille de police */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <Palette size={24} className="mr-3" />
                {t('appearance')}
              </h2>

              {/* Taille de police */}
              <div>
                <div className={`block text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  {state.settings.language === 'fr' ? 'Taille de police' : 'Font size'}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {fontSizes.map((value, idx) => {
                    const isSelected = state.settings.fontSize === value;
                    const isLastOdd = fontSizes.length % 2 === 1 && idx === fontSizes.length - 1;
                    return (
                      <button
                        key={value}
                        onClick={() => updateSettings({ fontSize: value })}
                        aria-pressed={isSelected}
                        className={`${
                          isLastOdd ? 'col-span-2' : ''
                        } px-4 py-3 rounded-lg border-2 font-medium transition-all duration-200 ${
                          isSelected
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : isDark
                            ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                            : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {value}px
                      </button>
                    );
                  })}
                </div>

                {/* Mode Malvoyant (XL) */}
                <div className="mt-4">
                  <button
                    onClick={() => updateSettings({ fontSize: 36 })}
                    className={`w-full px-4 py-4 rounded-lg border-2 font-semibold tracking-wide transition-all duration-200 ${
                      isDark
                        ? 'border-gray-500 bg-gray-700 text-white hover:border-gray-400'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {state.settings.language === 'fr' ? 'Mode Malvoyant (XL)' : 'Low-vision mode (XL)'}
                  </button>
                </div>

                {/* Aperçu */}
                <div className={`mt-4 p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg`}>
                  <p
                    className={`${isDark ? 'text-white' : 'text-gray-700'}`}
                    style={{ fontSize: `${state.settings.fontSize}px` }}
                  >
                    {state.settings.language === 'fr'
                      ? 'Aperçu de la taille de police sélectionnée.'
                      : 'Preview of the selected font size.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Langue */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <Globe size={24} className="mr-3" />
                {t('language')}
              </h2>

              <div className="space-y-4">
                <button
                  onClick={() => updateSettings({ language: 'fr' })}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                    state.settings.language === 'fr'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : isDark
                      ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                      : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🇫🇷</span>
                    <div className="text-left">
                      <div className="font-semibold">Français</div>
                      <div className={`${isDark ? 'text-white/80' : 'text-gray-600'} text-sm`}>Louis Segond 1910</div>
                    </div>
                  </div>
                  {state.settings.language === 'fr' && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                </button>

                <button
                  onClick={() => updateSettings({ language: 'en' })}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                    state.settings.language === 'en'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : isDark
                      ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                      : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🇺🇸</span>
                    <div className="text-left">
                      <div className="font-semibold">English</div>
                      <div className={`${isDark ? 'text-white/80' : 'text-gray-600'} text-sm`}>King James Version</div>
                    </div>
                  </div>
                  {state.settings.language === 'en' && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                </button>
              </div>

              <div className={`mt-6 p-4 ${isDark ? 'bg-gray-700' : 'bg-blue-50'} rounded-lg`}>
                <p className={`text-sm ${isDark ? 'text-white/90' : 'text-blue-700'}`}>
                  {state.settings.language === 'fr'
                    ? 'La langue est détectée automatiquement selon votre navigateur, mais vous pouvez la changer manuellement.'
                    : 'Language is automatically detected based on your browser, but you can change it manually.'}
                </p>
              </div>
            </div>

            {/* Mises à jour (largeur 2 colonnes) */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 md:col-span-2`}>
              <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <RefreshCcw size={22} className="mr-3" />
                {state.settings.language === 'fr' ? 'Mises à jour' : 'Updates'}
              </h2>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className={`${isDark ? 'text-white/80' : 'text-gray-700'} text-sm`}>
                  {state.settings.language === 'fr'
                    ? "Vérifie s'il existe une nouvelle version de l'application et applique-la."
                    : 'Check if a new version is available and apply it.'}
                </div>

                <div className="flex gap-3">
                  {updateStatus === 'ready' ? (
                    <button
                      onClick={applyUpdate}
                      className="px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 border-green-500 bg-green-50 text-green-700"
                    >
                      {state.settings.language === 'fr' ? 'Appliquer la mise à jour' : 'Apply update'}
                    </button>
                  ) : (
                    <button
                      onClick={handleCheckUpdates}
                      disabled={updateStatus === 'checking'}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                        updateStatus === 'checking'
                          ? 'opacity-70 cursor-wait border-gray-500 text-gray-300'
                          : isDark
                          ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                          : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {state.settings.language === 'fr' ? 'Vérifier les mises à jour' : 'Check for updates'}
                    </button>
                  )}
                </div>
              </div>

              {/* Statut */}
              <div className="mt-4 text-sm">
                {updateStatus === 'checking' && (
                  <p className={isDark ? 'text-white/80' : 'text-gray-700'}>
                    {state.settings.language === 'fr' ? 'Vérification en cours…' : 'Checking…'}
                  </p>
                )}
                {updateStatus === 'upToDate' && (
                  <p className="text-green-500">
                    {state.settings.language === 'fr' ? "Votre application est à jour." : 'Your app is up to date.'}
                  </p>
                )}
                {updateStatus === 'ready' && (
                  <p className="text-yellow-400">
                    {state.settings.language === 'fr'
                      ? 'Nouvelle version prête. Cliquez sur « Appliquer la mise à jour ».'
                      : 'New version ready. Click “Apply update”.'}
                  </p>
                )}
                {updateStatus === 'unavailable' && (
                  <p className="text-red-400">
                    {state.settings.language === 'fr'
                      ? "Mise à jour automatique indisponible (Service Worker non détecté)."
                      : 'Automatic update unavailable (No Service Worker).'}
                  </p>
                )}
                {updateStatus === 'error' && (
                  <p className="text-red-400">
                    {state.settings.language === 'fr'
                      ? 'Erreur lors de la vérification. Réessayez.'
                      : 'Error while checking. Please try again.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Aide raccourcis */}
          <div className="mt-6">
            <QuickSlotsHelp />
          </div>

          {/* Info */}
          <div className={`mt-8 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {state.settings.language === 'fr' ? 'Informations' : 'Information'}
            </h3>
            <p className={`${isDark ? 'text-white/90' : 'text-gray-600'} leading-relaxed`}>
              {state.settings.language === 'fr'
                ? 'Vos paramètres sont automatiquement sauvegardés et seront restaurés lors de votre prochaine visite.'
                : 'Your settings are automatically saved and will be restored on your next visit.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

