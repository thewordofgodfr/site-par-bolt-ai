import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { AppSettings, Language, Theme } from '../types/bible';

interface AppState {
  settings: AppSettings;
  currentPage: string;
  readingContext?: { book: string; chapter: number };
}

type AppAction =
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_FONT_SIZE'; payload: number }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_PAGE'; payload: string }
  | { type: 'LOAD_SETTINGS'; payload: AppSettings }
  | { type: 'SET_READING_CONTEXT'; payload: { book: string; chapter: number } }
  | { type: 'SAVE_READING_POSITION'; payload: { book: string; chapter: number } };

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  navigateToVerse: (book: string, chapter: number) => void;
  saveReadingPosition: (book: string, chapter: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getInitialLanguage = (): Language => {
  const savedLanguage = localStorage.getItem('bibleApp_language') as Language;
  if (savedLanguage) return savedLanguage;
  
  // Auto-detect based on browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('fr')) return 'fr';
  return 'en';
};

const initialState: AppState = {
  settings: {
    theme: 'light',
    fontSize: 16,
    language: getInitialLanguage(),
  },
  currentPage: 'home',
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        settings: { ...state.settings, theme: action.payload },
      };
    case 'SET_FONT_SIZE':
      return {
        ...state,
        settings: { ...state.settings, fontSize: action.payload },
      };
    case 'SET_LANGUAGE':
      return {
        ...state,
        settings: { ...state.settings, language: action.payload },
      };
    case 'SET_PAGE':
      // Réinitialiser le contexte de lecture sauf si on va vers 'reading'
      return {
        ...state,
        currentPage: action.payload,
        readingContext: action.payload === 'reading' ? state.readingContext : undefined
      };
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
            timestamp: Date.now()
          }
        }
      };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('bibleApp_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: 'LOAD_SETTINGS', payload: { ...initialState.settings, ...settings } });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('bibleApp_settings', JSON.stringify(state.settings));
    localStorage.setItem('bibleApp_language', state.settings.language);
  }, [state.settings]);

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
      }
    });
  };

  const navigateToVerse = (book: string, chapter: number) => {
    dispatch({ type: 'SET_READING_CONTEXT', payload: { book, chapter } });
    dispatch({ type: 'SET_PAGE', payload: 'reading' });
  };

  const saveReadingPosition = (book: string, chapter: number) => {
    dispatch({ type: 'SAVE_READING_POSITION', payload: { book, chapter } });
  };

  return (
    <AppContext.Provider value={{ state, dispatch, updateSettings, navigateToVerse, saveReadingPosition }}>
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
