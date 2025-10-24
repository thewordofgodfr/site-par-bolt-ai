import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { AppSettings, Language, Theme } from '../types/bible';

/** Pages supportées dans l’app (tu peux en ajouter ici si besoin) */
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
  /** Navigue vers Lecture avec un contexte précis (livre, chapitre, verset optionnel) */
  navigateToVerse: (book: string, chapter: number, verse?: number) => void;
  /** Sauvegarde la position de lecture (utilisé pour la reprise) */
  saveReadingPosition: (book: string, chapter: number) => void;
  /** Naviguer vers une page donnée (ex: 'search' pour un écran de recherche dédié) */
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
    theme: 'dark', // DÉFAUT : sombre
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
function ensureMeta(name: string, defaultContent = ''): HTMLMetaElement {
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
   * 👉 Application du thème + compat avec “force dark” Android/WebView
   * Règles cibles (tes 4 points) :
   * 1) tel sombre + app sombre → sombre adouci (fond gris-800)
   * 2) tel sombre + app clair  → VRAI clair (pas d’inversion)
   * 3) tel clair  + app clair  → clair
   * 4) tel clair  + app sombre → sombre adouci (comme 1)
   */
  useEffect(() => {
    try {
      const root = document.documentElement;
      const appDark = state.settings.theme === 'dark';
      const systemPrefersDark =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

      // Palette “soft dark”
      const SOFT_DARK_BG = '#1f2937'; // Tailwind gray-800 (plus lisible que #111827)
      const SOFT_DARK_TEXT = '#ffffff';
      const LIGHT_BG = '#ffffff';
      const LIGHT_TEXT = '#111827';

      // Tailwind “dark” (contrôle des variantes)
      if (appDark) root.classList.add('dark');
      else root.classList.remove('dark');

      // Classe helper si tu veux cibler soft-dark en CSS (optionnelle)
      root.classList.toggle('soft-dark', appDark);

      // Désactive l’auto-inversion quand l’app veut être claire (cas 2 & 3)
      // et annonce un vrai dark quand l’app est sombre (cas 1 & 4).
      const metaTheme = ensureMeta('theme-color');
      const metaColorScheme = ensureMeta('color-scheme');
      const metaSupportedSchemes = ensureMeta('supported-color-schemes');

      if (appDark) {
        // Cas 1 & 4 : sombre adouci
        (root.style as any).colorScheme = 'dark';
        document.body.style.backgroundColor = SOFT_DARK_BG;
        document.body.style.color = SOFT_DARK_TEXT;
        metaTheme.content = SOFT_DARK_BG;
        metaColorScheme.content = 'dark';
        metaSupportedSchemes.content = 'dark';
      } else {
        // Cas 2 & 3 : forcer clair même si l’OS est sombre
        (root.style as any).colorScheme = 'light';
        document.body.style.backgroundColor = LIGHT_BG;
        document.body.style.color = LIGHT_TEXT;
        metaTheme.content = LIGHT_BG;
        metaColorScheme.content = 'light';
        metaSupportedSchemes.content = 'light';
      }

      // Expose le thème (debug/diagnostic)
      root.setAttribute('data-theme', appDark ? 'dark' : 'light');

      // Si les préférences système changent (rarement utile ici), on peut réagir :
      // on n’écrase PAS le choix utilisateur, mais on peut re-teinter la barre.
      const media = window.matchMedia?.('(prefers-color-scheme: dark)');
      const onChange = () => {
        // On re-pousse juste la bonne couleur de barre selon le choix utilisateur.
        metaTheme.content = appDark ? SOFT_DARK_BG : LIGHT_BG;
      };
      media?.addEventListener?.('change', onChange);
      return () => media?.removeEventListener?.('change', onChange);
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

  /** Navigue vers lecture avec un contexte précis (utilisé pour “verset aléatoire”, résultats de recherche, etc.) */
  const navigateToVerse = (book: string, chapter: number, verse?: number) => {
    dispatch({ type: 'SET_READING_CONTEXT', payload: { book, chapter, verse } });
    dispatch({ type: 'SET_PAGE', payload: 'reading' });
  };

  /** Sauvegarde de la position de lecture */
  const saveReadingPosition = (book: string, chapter: number) => {
    dispatch({ type: 'SAVE_READING_POSITION', payload: { book, chapter } });
  };

  /** Navigation générique (utile pour ouvrir une future page “search”) */
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

