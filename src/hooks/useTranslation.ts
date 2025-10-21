import { useApp } from '../contexts/AppContext';

const translations = {
  fr: {
    // Navigation
    home: 'Accueil',
    reading: 'Lecture',
    search: 'Recherche',
    settings: 'Paramètres',
    about: 'À propos',
    
    // Home page
    randomVerse: 'Verset Aléatoire',
    newVerse: 'Nouveau Verset',
    copyVerse: 'Copier le Verset',
    verseCopied: 'Verset copié !',
    godSpeaks: 'Dieu vous parle',
    
    // Reading page
    selectBook: 'Sélectionner un livre',
    selectChapter: 'Sélectionner un chapitre',
    chapter: 'Chapitre',
    oldTestament: 'Ancien Testament',
    newTestament: 'Nouveau Testament',
    
    // Settings page
    appearance: 'Apparence',
    lightMode: 'Mode Clair',
    darkMode: 'Mode Sombre',
    fontSize: 'Taille de Police',
    language: 'Langue',
    french: 'Français',
    english: 'Anglais',
    
    // About page
    aboutTitle: '',
    aboutDescription: 'The Word vous permet de découvrir la parole de Dieu à travers des versets aléatoires et une lecture complète de la Bible.',
    bibleVersions: 'Versions de la Bible',
    frenchVersion: 'Français : Louis Segond 1910 (LSG) - Libre de droit',
    englishVersion: 'Anglais : King James Version (KJV) - Libre de droit',
    randomFeature: 'Fonctionnalité Aléatoire',
    randomFeatureDesc: 'Notre générateur de versets aléatoires sélectionne parmi plus de 31,000 versets bibliques pour vous offrir une inspiration quotidienne.',
    musicLink: 'Musique du Créateur',
    
    // Common
    loading: 'Chargement...',
    error: 'Erreur lors du chargement',
  },
  en: {
    // Navigation
    home: 'Home',
    reading: 'Reading',
    settings: 'Settings',
    about: 'About',
    
    // Home page
    randomVerse: 'Random Verse',
    newVerse: 'New Verse',
    copyVerse: 'Copy Verse',
    verseCopied: 'Verse copied!',
    godSpeaks: 'God speaks to you',
    
    // Reading page
    selectBook: 'Select a book',
    selectChapter: 'Select a chapter',
    chapter: 'Chapter',
    oldTestament: 'Old Testament',
    newTestament: 'New Testament',
    
    // Settings page
    appearance: 'Appearance',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    fontSize: 'Font Size',
    language: 'Language',
    french: 'Français',
    english: 'English',
    
    // About page
    aboutTitle: '',
    aboutDescription: 'The Word allows you to discover God\'s word through random verses and complete Bible reading.',
    bibleVersions: 'Bible Versions',
    frenchVersion: 'French: Louis Segond 1910 (LSG) - Public Domain',
    englishVersion: 'English: King James Version (KJV) - Public Domain',
    randomFeature: 'Random Feature',
    randomFeatureDesc: 'Our random verse generator selects from over 31,000 biblical verses to provide you with daily inspiration.',
    musicLink: 'Creator\'s Music',
    
    // Common
    loading: 'Loading...',
    error: 'Error loading content',
  },
};

export function useTranslation() {
  const { state } = useApp();
  
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[state.settings.language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return { t, language: state.settings.language };
}
