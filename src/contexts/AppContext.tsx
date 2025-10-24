// src/contexts/AppContext.tsx
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

/** Langue initiale */
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
    theme: 'dark',           // ✅ défaut sombre (ta “référence”)
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

/** meta helper */
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  /** Charger les préférences */
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

  /** Sauvegarder les préférences */
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
        localStorage.setItem(STORAGE_KEYS.language, state.settings.language);
      }
    } catch {}
  }, [state.settings]);

  /**
   * 👉 Appliquer le thème choisi + gérer le cas “téléphone sombre + appli claire”
   * Règle:
   *   - Si app = dark  -> dark + palette bleue
   *   - Si app = light ET OS = dark -> on active quand même la palette sombre bleue
   *       → évite l’auto-dark grisâtre, texte blanc franc (index.css fait le reste)
   *   - Si app = light ET OS = light -> clair normal
   */
  useEffect(() => {
    try {
      const root = document.documentElement;
      const appDark = state.settings.theme === 'dark';
      const prefersDark = !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

      const useDarkSkin = appDark || (!appDark && prefersDark);

      // classes globales
      root.classList.toggle('dark', useDarkSkin);
      root.classList.toggle('theme-dark-blue', useDarkSkin);
      root.setAttribute('data-theme', useDarkSkin ? 'dark' : 'light');

      // Méta (barres navigateur)
      const metaTheme = ensureMeta('theme-color');
      const metaColorScheme = ensureMeta('color-scheme');
      const metaSupportedSchemes = ensureMeta('supported-color-schemes');

      if (useDarkSkin) {
        (root.style as any).colorScheme = 'dark';
        document.body.style.backgroundColor = '#0f172a'; // slate-900
        document.body.style.color = '#ffffff';
        if (metaTheme) metaTheme.content = '#0f172a';
        if (metaColorScheme) metaColorScheme.content = 'dark';
        if (metaSupportedSchemes) metaSupportedSchemes.content = 'dark';
      } else {
        (root.style as any).colorScheme = 'light';
        (root.style as any).forcedColorAdjust = 'none';
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#111827';
        if (metaTheme) metaTheme.content = '#ffffff';
        if (metaColorScheme) metaColorScheme.content = 'light';
        if (metaSupportedSchemes) metaSupportedSchemes.content = 'light';
      }

      // Si l’utilisateur change le thème système à chaud, on ré-applique
      const media = window.matchMedia?.('(prefers-color-scheme: dark)');
      const onChange = () => {
        const nowPrefersDark = !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const nowUseDark = state.settings.theme === 'dark' || (state.settings.theme === 'light' && nowPrefersDark);
        root.classList.toggle('dark', nowUseDark);
        root.classList.toggle('theme-dark-blue', nowUseDark);
        root.setAttribute('data-theme', nowUseDark ? 'dark' : 'light');
        if (metaTheme) metaTheme.content = nowUseDark ? '#0f172a' : '#ffffff';
        (root.style as any).colorScheme = nowUseDark ? 'dark' : 'light';
        document.body.style.backgroundColor = nowUseDark ? '#0f172a' : '#ffffff';
        document.body.style.color = nowUseDark ? '#ffffff' : '#111827';
      };
      media?.addEventListener?.('change', onChange);
      return () => media?.removeEventListener?.('change', onChange);
    } catch {}
  }, [state.settings.theme]);

  /** Update partiel des settings */
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

  const navigateToVerse = (book: string, chapter: number, verse?: number) => {
    dispatch({ type: 'SET_READING_CONTEXT', payload: { book, chapter, verse } });
    dispatch({ type: 'SET_PAGE', payload: 'reading' });
  };

  const saveReadingPosition = (book: string, chapter: number) => {
    dispatch({ type: 'SAVE_READING_POSITION', payload: { book, chapter } });
  };

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
