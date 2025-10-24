import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { AppSettings, Language, Theme } from '../types/bible';

/** Pages supportées dans l’app */
type Page = 'home' | 'reading' | 'settings' | 'about' | 'search';

interface ReadingContext {
  book: string;
  chapter: number;
  verse?: number;
}

interface AppState {
  settings: AppSettings;
  currentPage: Page;
  /** Contexte de navigation vers Lecture (permet d’ouvrir directement un chapitre/verset) */
  readingContext?: ReadingContext;
}

type AppAction =
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_FONT_SIZE'; payload: number }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_PAGE'; payload: Page }
  | { type: 'LOAD_SETTINGS'; payload: AppSettings }
  | { type: 'SET_READING_CONTEXT'; payload: ReadingContext }
  | { type: 'SAVE_READING_POSITION'; payload: { book: string; chapter: number } };

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  navigateToVerse: (book: string, chapter: number, verse?: number) => void;
  saveReadingPosition: (book: string, chapter: number) => void;
  setPage: (page: Page) => void;
}

const STORAGE_KEYS = {
  settings: 'bibleApp_settings',
  language: 'bibleApp_language',
} as const;

const AppContext = createContext<AppContextType | undefined>(undefined);

/** Langue initiale : préférer la langue sauvegardée, sinon déduire du navigateur */
const getInitialLanguage = (): Language => {
  try {
    const savedLanguage = (typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEYS.language)
      : null) as Language | null;
    if (savedLanguage) return savedLanguage;
  } catch {}
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language?.toLowerCase() || '';
    if (browserLang.startsWith('fr')) return 'fr';
  }
  return 'en';
};

const initialState: AppState = {
  settings: {
    // ✅ DÉFAUT sombre (ta référence)
    theme: 'dark',
    fontSize: 16,
    language: getInitialLanguage(),
  },
  currentPage: 'home',
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, settings: { ...state.settings, theme: action.payload } };
    case 'SET_FONT_SIZE':
      return { ...state, settings: { ...state.settings, fontSize: action.payload } };
    case 'SET_LANGUAGE':
      return { ...state, settings: { ...state.settings, language: action.payload } };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'LOAD_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_READING_CONTEXT':
      return { ...state, readingContext: action.payload };
    case 'SAVE_READING_POSITION':
      return {
        ...state,
        settings: {
          ...state.settings,
          lastReadingPosition: {
            book: action.payload.book,
            chapter: action.payload.chapter,
            timestamp: Date.now(),
          },
        },
      };
    default:
      return state;
  }
}

/** util pour créer/récupérer une meta */
function ensureMeta(name: string, defaultContent = ''): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    if (defaultContent) el.setAttribute('content', defaultContent);
    document.head.appendChild(el);
  }
  return el;
}

/** injecte (une seule fois) la feuille de style globale des thèmes */
function ensureThemeStylePatch() {
  if (typeof document === 'undefined') return;
  const id = 'tw-theme-patch';
  if (document.getElementById(id)) return;

  const css = `
/* ======= ENFORCER : VRAI MODE CLAIR =======
   - Neutralise les inversions "auto dark" (WebView/Chrome) lorsqu'on choisit le clair.
   - Garde des couleurs nettes (fond blanc, texte gris-900).
*/
html[data-theme="light"] {
  color-scheme: light !important;
  forced-color-adjust: none !important;
  filter: none !important;
  background-color: #ffffff !important;
}
html[data-theme="light"] body {
  background-color: #ffffff !important;
  color: #111827 !important; /* gray-900 */
}

/* ======= PALETTE SOMBRE BLEU (référence) ======= */
html.theme-dark-blue {
  --tw-db-bg: #0f172a;         /* slate-900 : bleu foncé */
  --tw-db-surface: #111c2e;    /* surface principale (légèrement plus claire que bg) */
  --tw-db-surface-2: #15233b;  /* surface secondaire */
  --tw-db-border: rgba(255,255,255,.14);
  --tw-db-text: #ffffff;       /* blanc fort */
  --tw-db-subtext: rgba(255,255,255,.92);
}

/* Fond + texte par défaut */
html.theme-dark-blue, html.theme-dark-blue body {
  background-color: var(--tw-db-bg) !important;
  color: var(--tw-db-text) !important;
}

/* ======= Overrides Tailwind fréquents -> palette sombre bleu ======= */

/* Backgrounds sombres */
html.theme-dark-blue .bg-gray-900 { background-color: var(--tw-db-bg) !important; }
html.theme-dark-blue .bg-gray-800 { background-color: var(--tw-db-surface) !important; }
html.theme-dark-blue .bg-gray-700 { background-color: var(--tw-db-surface-2) !important; }
/* fonds clairs utilisés en light → remappés à des surfaces sombres */
html.theme-dark-blue .bg-gray-50,
html.theme-dark-blue .bg-gray-100,
html.theme-dark-blue .bg-white,
html.theme-dark-blue .bg-white\\/95 { background-color: var(--tw-db-surface) !important; }

/* Bordures */
html.theme-dark-blue .border-gray-200,
html.theme-dark-blue .border-gray-300,
html.theme-dark-blue .border-gray-400,
html.theme-dark-blue .border-gray-500,
html.theme-dark-blue .border-gray-600,
html.theme-dark-blue .border-gray-700 { border-color: var(--tw-db-border) !important; }

/* Texte : toujours “blanc-blanc” en sombre */
html.theme-dark-blue .text-gray-100,
html.theme-dark-blue .text-gray-200,
html.theme-dark-blue .text-gray-300,
html.theme-dark-blue .text-gray-400,
html.theme-dark-blue .text-gray-500,
html.theme-dark-blue .text-gray-600,
html.theme-dark-blue .text-gray-700,
html.theme-dark-blue .text-gray-800,
html.theme-dark-blue .text-gray-900 { color: var(--tw-db-text) !important; }

html.theme-dark-blue .text-white,
html.theme-dark-blue .text-white\\/90,
html.theme-dark-blue .text-white\\/80,
html.theme-dark-blue .text-white\\/70,
html.theme-dark-blue .text-white\\/60 { color: var(--tw-db-text) !important; }

/* Surfaces translucides (barres collantes, overlays blancs translucides, etc.) */
html.theme-dark-blue .bg-gray-800\\/95 { background-color: color-mix(in srgb, var(--tw-db-surface) 95%, transparent) !important; }
html.theme-dark-blue .bg-white\\/95 { background-color: color-mix(in srgb, var(--tw-db-surface) 95%, transparent) !important; }

/* Petits helpers pour que les cartes “claires” restent lisibles en sombre */
html.theme-dark-blue .shadow,
html.theme-dark-blue .shadow-lg,
html.theme-dark-blue .shadow-xl { box-shadow: 0 10px 24px rgba(0,0,0,.35) !important; }
`;

  const style = document.createElement('style');
  style.id = id;
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  /** Patch CSS (une seule fois) */
  useEffect(() => { try { ensureThemeStylePatch(); } catch {} }, []);

  /** Chargement des préférences */
  useEffect(() => {
    try {
      const saved = typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEYS.settings)
        : null;
      if (saved) {
        const settings = JSON.parse(saved);
        dispatch({ type: 'LOAD_SETTINGS', payload: { ...initialState.settings, ...settings } });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sauvegarde des préférences */
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
        localStorage.setItem(STORAGE_KEYS.language, state.settings.language);
      }
    } catch {}
  }, [state.settings]);

  /**
   * 👉 Application stricte du thème choisi (ignore les préférences système) :
   * - app sombre => palette “bleu foncé” (référence)
   * - app clair  => vrai clair, même si le téléphone est en sombre / force-dark
   */
  useEffect(() => {
    try {
      const root = document.documentElement;
      const appDark = state.settings.theme === 'dark';

      // Variantes Tailwind
      root.classList.toggle('dark', appDark);

      // Skin sombre “bleu foncé”
      root.classList.toggle('theme-dark-blue', appDark);

      // Expose (utilisé par le patch CSS light enforcer)
      root.setAttribute('data-theme', appDark ? 'dark' : 'light');

      // Méta pour les barres navigateur
      const metaTheme = ensureMeta('theme-color');
      const metaColorScheme = ensureMeta('color-scheme');
      const metaSupportedSchemes = ensureMeta('supported-color-schemes');

      if (appDark) {
        // Sombre : ta référence (tel clair + app sombre)
        (root.style as any).colorScheme = 'dark';
        document.body.style.backgroundColor = '#0f172a'; // slate-900
        document.body.style.color = '#ffffff';
        if (metaTheme) metaTheme.content = '#0f172a';
        if (metaColorScheme) metaColorScheme.content = 'dark';
        if (metaSupportedSchemes) metaSupportedSchemes.content = 'dark';
      } else {
        // Vrai clair (même si téléphone en sombre)
        (root.style as any).colorScheme = 'light';
        (root.style as any).forcedColorAdjust = 'none';
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#111827';
        if (metaTheme) metaTheme.content = '#ffffff';
        if (metaColorScheme) metaColorScheme.content = 'light';
        if (metaSupportedSchemes) metaSupportedSchemes.content = 'light';
      }
    } catch {}
  }, [state.settings.theme]);

  /** Mise à jour partielle des settings */
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    Object.entries(newSettings).forEach(([key, value]) => {
      switch (key) {
        case 'theme':
          dispatch({ type: 'SET_THEME', payload: value as Theme });
          break;
        case 'fontSize':
          dispatch({ type: 'SET_FONT_SIZE', payload: value as number });
          break;
        case 'language':
          dispatch({ type: 'SET_LANGUAGE', payload: value as Language });
          break;
        default:
          break;
      }
    });
  };

  /** Aller directement dans Lecture */
  const navigateToVerse = (book: string, chapter: number, verse?: number) => {
    dispatch({ type: 'SET_READING_CONTEXT', payload: { book, chapter, verse } });
    dispatch({ type: 'SET_PAGE', payload: 'reading' });
  };

  /** Sauvegarde de la position de lecture */
  const saveReadingPosition = (book: string, chapter: number) => {
    dispatch({ type: 'SAVE_READING_POSITION', payload: { book, chapter } });
  };

  /** Navigation générique */
  const setPage = (page: Page) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  };

  return (
    <AppContext.Provider
      value={{ state, dispatch, updateSettings, navigateToVerse, saveReadingPosition, setPage }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

