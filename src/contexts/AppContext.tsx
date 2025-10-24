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
  } catch {
    /* no-op */
  }
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language?.toLowerCase() || '';
    if (browserLang.startsWith('fr')) return 'fr';
  }
  return 'en';
};

const initialState: AppState = {
  settings: {
    theme: 'dark', // DÉFAUT : sombre (bleu foncé adouci)
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

/** injecte un patch CSS global pour le sombre “bleu foncé” + forcer le clair */
function ensureThemeStylePatch() {
  if (typeof document === 'undefined') return;
  const id = 'tw-theme-patch';
  if (document.getElementById(id)) return;

  const css = `
/* ====== LIGHT ENFORCER ======
   Empêche l’auto-inversion (Android WebView/Chrome) quand l’app est en clair.
*/
html[data-theme="light"] { 
  color-scheme: light !important;
  forced-color-adjust: none !important; /* évite certains modes forcés */
}
html[data-theme="light"], html[data-theme="light"] body {
  background-color: #ffffff !important;
  color: #111827 !important; /* gray-900 */
}

/* ====== DARK BLUE PALETTE ====== */
html.theme-dark-blue {
  --tw-db-bg: #0f172a;         /* slate-900 : bleu foncé */
  --tw-db-surface: #111c2e;    /* surface principale */
  --tw-db-surface-2: #15233b;  /* surface secondaire */
  --tw-db-border: rgba(255,255,255,.12);
  --tw-db-text: #ffffff;       /* blanc “blanc” */
  --tw-db-subtext: rgba(255,255,255,.86);
}

/* Fond + texte par défaut */
html.theme-dark-blue, html.theme-dark-blue body {
  background-color: var(--tw-db-bg) !important;
  color: var(--tw-db-text) !important;
}

/* Override des utilitaires Tailwind fréquents utilisés dans les pages
   → on les remappe vers la palette bleu foncé sans toucher le code des pages. */
html.theme-dark-blue .bg-gray-900 { background-color: var(--tw-db-bg) !important; }
html.theme-dark-blue .bg-gray-800 { background-color: var(--tw-db-surface) !important; }
html.theme-dark-blue .bg-gray-700 { background-color: var(--tw-db-surface-2) !important; }
html.theme-dark-blue .border-gray-700 { border-color: var(--tw-db-border) !important; }
html.theme-dark-blue .border-gray-600 { border-color: var(--tw-db-border) !important; }

/* Texte bien blanc dans tout le mode sombre (même si les pages utilisent des text-gray-xxx) */
html.theme-dark-blue .text-gray-100,
html.theme-dark-blue .text-gray-200,
html.theme-dark-blue .text-gray-300,
html.theme-dark-blue .text-gray-400,
html.theme-dark-blue .text-gray-500 { color: var(--tw-db-text) !important; }

/* Les utilitaires avec opacité (text-white/80, etc.) */
html.theme-dark-blue .text-white\\/80,
html.theme-dark-blue .text-white\\/70,
html.theme-dark-blue .text-white\\/60 { color: var(--tw-db-subtext) !important; }

/* Petites surfaces translucides souvent utilisées pour les barres collantes */
html.theme-dark-blue .bg-gray-800\\/95 { background-color: color-mix(in srgb, var(--tw-db-surface) 95%, transparent) !important; }
html.theme-dark-blue .bg-white\\/95.dark\\:bg-gray-800\\/95 { background-color: color-mix(in srgb, var(--tw-db-surface) 95%, transparent) !important; }
`;

  const style = document.createElement('style');
  style.id = id;
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  /** Charger patch CSS une fois */
  useEffect(() => {
    try { ensureThemeStylePatch(); } catch {}
  }, []);

  /** Chargement des préférences depuis localStorage */
  useEffect(() => {
    try {
      const saved = typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEYS.settings)
        : null;
      if (saved) {
        const settings = JSON.parse(saved);
        dispatch({
          type: 'LOAD_SETTINGS',
          payload: { ...initialState.settings, ...settings },
        });
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
    } catch {
      /* no-op */
    }
  }, [state.settings]);

  /**
   * 👉 Application du thème + compat cas 1–4 demandés
   * 1) tel clair  + app sombre → sombre “bleu foncé” (fonds plus sombres, texte blanc)
   * 2) tel clair  + app clair  → clair
   * 3) tel sombre + app clair  → forcer le VRAI clair (désactive auto-inversion) ; si l’UA insiste, nos couleurs restent explicites
   * 4) tel sombre + app sombre → sombre “bleu foncé” mais un peu plus doux qu’un noir pur
   */
  useEffect(() => {
    try {
      const root = document.documentElement;
      const appDark = state.settings.theme === 'dark';

      // Tailwind "dark:" variants
      root.classList.toggle('dark', appDark);

      // Classe palette bleu foncé (notre skin sombre)
      root.classList.toggle('theme-dark-blue', appDark);

      // Expose le thème (sert aussi au patch CSS)
      root.setAttribute('data-theme', appDark ? 'dark' : 'light');

      // Méta & couleurs systèmes (barres navigateur, etc.)
      const metaTheme = ensureMeta('theme-color');
      const metaColorScheme = ensureMeta('color-scheme');
      const metaSupportedSchemes = ensureMeta('supported-color-schemes');

      if (appDark) {
        // Sombre bleu foncé
        (root.style as any).colorScheme = 'dark';
        document.body.style.backgroundColor = '#0f172a'; // slate-900
        document.body.style.color = '#ffffff';
        if (metaTheme) metaTheme.content = '#0f172a';
        if (metaColorScheme) metaColorScheme.content = 'dark';
        if (metaSupportedSchemes) metaSupportedSchemes.content = 'dark';
      } else {
        // Clair (vraiment clair même si le tel est en sombre)
        (root.style as any).colorScheme = 'light';
        (root.style as any).forcedColorAdjust = 'none'; // aide à neutraliser certains modes forcés
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#111827';
        if (metaTheme) metaTheme.content = '#ffffff';
        if (metaColorScheme) metaColorScheme.content = 'light';
        if (metaSupportedSchemes) metaSupportedSchemes.content = 'light';
      }
    } catch {
      /* no-op */
    }
  }, [state.settings.theme]);

  /** Mise à jour partielle des settings (thème, taille police, langue) */
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

  /** Navigue vers Lecture (utilisé pour “verset aléatoire”, résultats de recherche, etc.) */
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

