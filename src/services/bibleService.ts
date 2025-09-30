import { BibleVerse, BibleChapter, Language } from '../types/bible';
import { bibleBooks } from '../data/bibleBooks';
import { searchInText } from '../utils/searchUtils';

// Interface pour la structure de vos fichiers JSON
interface BibleVerse_JSON {
  ID: number;
  Text: string;
}

interface BibleChapter_JSON {
  Number: number;
  Verses: BibleVerse_JSON[];
}

interface BibleBook_JSON {
  Name: string;
  Chapters: BibleChapter_JSON[];
}

// Cache pour stocker les livres chargés
const bibleCache: Map<string, BibleBook_JSON> = new Map();

// Cache pour stocker tous les versets d'une langue
const allVersesCache: Map<string, BibleVerse[]> = new Map();

// Fonction pour générer des variantes de noms de fichiers
function generateFileNameVariants(bookName: string, language: Language): string[] {
  const book = bibleBooks.find(b => b.name === bookName);
  if (!book) return [bookName];
  
  const baseName = language === 'fr' ? book.nameFr : book.nameEn;
  const variants: string[] = [];
  
  variants.push(baseName); // exact
  variants.push(baseName.replace(/\s+/g, '')); // sans espaces
  
  const withoutAccents = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  variants.push(withoutAccents);
  variants.push(withoutAccents.replace(/\s+/g, ''));
  variants.push(baseName.replace(/\s+/g, '_'));
  variants.push(baseName.replace(/\s+/g, '-'));
  variants.push(withoutAccents.replace(/\s+/g, '_'));
  variants.push(withoutAccents.replace(/\s+/g, '-'));
  
  if (language === 'fr') {
    const manualReplacements = baseName
      .replace(/é|è|ê|ë/g, 'e')
      .replace(/à|â|ä/g, 'a')
      .replace(/ç/g, 'c')
      .replace(/î|ï/g, 'i')
      .replace(/ô|ö/g, 'o')
      .replace(/ù|û|ü/g, 'u')
      .replace(/ÿ/g, 'y');
    
    variants.push(manualReplacements);
    variants.push(manualReplacements.replace(/\s+/g, ''));
    variants.push(manualReplacements.replace(/\s+/g, '_'));
    variants.push(manualReplacements.replace(/\s+/g, '-'));
  }
  
  return [...new Set(variants)];
}

// Fonction pour essayer de charger un fichier avec différentes variantes
async function tryLoadBookFile(bookName: string, language: Language): Promise<BibleBook_JSON | null> {
  const variants = generateFileNameVariants(bookName, language);
  
  for (const variant of variants) {
    try {
      const response = await fetch(`/data/bible/${language}/${variant}.json`);
      if (response.ok) {
        const bookData: BibleBook_JSON = await response.json();
        return bookData;
      }
    } catch {
      // on continue avec les autres variantes
    }
  }
  return null;
}

// Charger un livre depuis les fichiers JSON
async function loadBook(bookName: string, language: Language): Promise<BibleBook_JSON | null> {
  const cacheKey = `${bookName}_${language}`;
  if (bibleCache.has(cacheKey)) {
    return bibleCache.get(cacheKey)!;
  }

  try {
    const bookData = await tryLoadBookFile(bookName, language);
    if (!bookData) return null;
    bibleCache.set(cacheKey, bookData);
    return bookData;
  } catch (error) {
    console.error(`❌ ERREUR DE CHARGEMENT: ${bookName} en ${language}`, error);
    return null;
  }
}

// Obtenir le nom du livre dans la bonne langue
function getBookReference(bookName: string, language: Language): string {
  const book = bibleBooks.find(b => b.name === bookName);
  if (!book) return bookName;
  return language === 'fr' ? book.nameFr : book.nameEn;
}

// Charger tous les versets d'une langue (TOUS les livres)
async function loadAllVerses(language: Language): Promise<BibleVerse[]> {
  const cacheKey = `all_verses_${language}`;
  if (allVersesCache.has(cacheKey)) {
    return allVersesCache.get(cacheKey)!;
  }

  console.log(`Loading all verses for ${language}...`);
  const allVerses: BibleVerse[] = [];
  
  try {
    for (const bookInfo of bibleBooks) {
      const book = await loadBook(bookInfo.name, language);
      if (book && book.Chapters) {
        for (const chapterData of book.Chapters) {
          for (const verseData of chapterData.Verses) {
            const bookReference = getBookReference(bookInfo.name, language);
            allVerses.push({
              book: bookInfo.name,
              chapter: chapterData.Number,
              verse: verseData.ID,
              text: verseData.Text,
              reference: `${bookReference} ${chapterData.Number}:${verseData.ID}`
            });
          }
        }
      }
    }
    console.log(`Loaded ${allVerses.length} verses for ${language}`);
    allVersesCache.set(cacheKey, allVerses);
    return allVerses;
  } catch (error) {
    console.error(`Error loading all verses for ${language}:`, error);
    return [];
  }
}

export async function getRandomVerse(language: Language): Promise<BibleVerse> {
  await new Promise(resolve => setTimeout(resolve, 300));
  try {
    const allVerses = await loadAllVerses(language);
    if (allVerses.length === 0) throw new Error('No verses loaded');
    const randomIndex = Math.floor(Math.random() * allVerses.length);
    return allVerses[randomIndex];
  } catch {
    return {
      book: 'John',
      chapter: 3,
      verse: 16,
      text: language === 'fr' 
        ? 'Car Dieu a tant aimé le monde qu\'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu\'il ait la vie éternelle.'
        : 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
      reference: language === 'fr' ? 'Jean 3:16' : 'John 3:16'
    };
  }
}

export async function getChapter(book: string, chapter: number, language: Language): Promise<BibleChapter> {
  await new Promise(resolve => setTimeout(resolve, 800));
  try {
    const bookData = await loadBook(book, language);
    if (!bookData) {
      const verses: BibleVerse[] = [];
      for (let i = 1; i <= 10; i++) {
        verses.push({
          book,
          chapter,
          verse: i,
          text: language === 'fr' 
            ? `📁 FICHIER MANQUANT: Ajoutez un fichier JSON pour ${book} dans public/data/bible/${language}/`
            : `📁 MISSING FILE: Add a JSON file for ${book} in public/data/bible/${language}/`,
          reference: `${getBookReference(book, language)} ${chapter}:${i}`
        });
      }
      return { book, chapter, verses };
    }

    const requestedChapter = bookData.Chapters.find(ch => ch.Number === chapter);
    if (!requestedChapter) throw new Error(`Chapter ${chapter} not found in book ${book}`);

    const verses: BibleVerse[] = requestedChapter.Verses.map(verseData => ({
      book,
      chapter,
      verse: verseData.ID,
      text: verseData.Text,
      reference: `${getBookReference(book, language)} ${chapter}:${verseData.ID}`
    }));

    return { book, chapter, verses };
  } catch (error) {
    console.error(`Error loading chapter ${book} ${chapter} in ${language}:`, error);
    const verses: BibleVerse[] = [];
    for (let i = 1; i <= 10; i++) {
      verses.push({
        book,
        chapter,
        verse: i,
        text: language === 'fr' 
          ? `📁 FICHIER MANQUANT: Ajoutez un fichier JSON pour ${book} dans public/data/bible/${language}/`
          : `📁 MISSING FILE: Add a JSON file for ${book} in public/data/bible/${language}/`,
        reference: `${getBookReference(book, language)} ${chapter}:${i}`
      });
    }
    return { book, chapter, verses };
  }
}

export function getBibleBooks() {
  return bibleBooks;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Recherche dans toute la Bible (TOUS les livres)
export async function searchInBible(searchTerm: string, language: Language): Promise<BibleVerse[]> {
  if (!searchTerm.trim()) return [];
  console.log(`Searching for "${searchTerm}" in ${language}...`);
  const results: BibleVerse[] = [];
  
  try {
    for (const bookInfo of bibleBooks) {
      const book = await loadBook(bookInfo.name, language);
      if (book && book.Chapters) {
        for (const chapterData of book.Chapters) {
          for (const verseData of chapterData.Verses) {
            if (searchInText(verseData.Text, searchTerm)) {
              const bookReference = getBookReference(bookInfo.name, language);
              results.push({
                book: bookInfo.name,
                chapter: chapterData.Number,
                verse: verseData.ID,
                text: verseData.Text,
                reference: `${bookReference} ${chapterData.Number}:${verseData.ID}`
              });
            }
          }
        }
      }
    }
    console.log(`Found ${results.length} verses for "${searchTerm}"`);
    return results;
  } catch (error) {
    console.error(`Error searching in Bible for ${language}:`, error);
    return [];
  }
}
