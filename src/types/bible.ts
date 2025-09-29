export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
}

export interface BibleBook {
  name: string;
  nameEn: string;
  nameFr: string;
  chapters: number;
  testament: 'old' | 'new';
}

export interface BibleChapter {
  book: string;
  chapter: number;
  verses: BibleVerse[];
}

export type Language = 'fr' | 'en';
export type Theme = 'light' | 'dark';

export interface AppSettings {
  theme: Theme;
  fontSize: number;
  language: Language;
}