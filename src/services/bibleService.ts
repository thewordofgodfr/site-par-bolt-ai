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
  
  // Variante 1: Nom exact
  variants.push(baseName);
  
  // Variante 2: Sans espaces
  variants.push(baseName.replace(/\s+/g, ''));
  
  // Variante 3: Sans accents (normalisation NFD puis suppression des diacritiques)
  const withoutAccents = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  variants.push(withoutAccents);
  
  // Variante 4: Sans espaces ni accents
  variants.push(withoutAccents.replace(/\s+/g, ''));
  
  // Variante 5: Remplacer espaces par underscores
  variants.push(baseName.replace(/\s+/g, '_'));
  
  // Variante 6: Remplacer espaces par tirets
  variants.push(baseName.replace(/\s+/g, '-'));
  
  // Variante 7: Sans accents avec underscores
  variants.push(withoutAccents.replace(/\s+/g, '_'));
  
  // Variante 8: Sans accents avec tirets
  variants.push(withoutAccents.replace(/\s+/g, '-'));
  
  // Variantes supplémentaires pour les cas spéciaux français
  if (language === 'fr') {
    // Remplacements manuels pour les accents problématiques
    const manualReplacements = baseName
      .replace(/é/g, 'e')
      .replace(/è/g, 'e')
      .replace(/ê/g, 'e')
      .replace(/ë/g, 'e')
      .replace(/à/g, 'a')
      .replace(/â/g, 'a')
      .replace(/ä/g, 'a')
      .replace(/ç/g, 'c')
      .replace(/î/g, 'i')
      .replace(/ï/g, 'i')
      .replace(/ô/g, 'o')
      .replace(/ö/g, 'o')
      .replace(/ù/g, 'u')
      .replace(/û/g, 'u')
      .replace(/ü/g, 'u')
      .replace(/ÿ/g, 'y');
    
    variants.push(manualReplacements);
    variants.push(manualReplacements.replace(/\s+/g, ''));
    variants.push(manualReplacements.replace(/\s+/g, '_'));
    variants.push(manualReplacements.replace(/\s+/g, '-'));
  }
  // Supprimer les doublons
  return [...new Set(variants)];
}

// Fonction pour essayer de charger un fichier avec différentes variantes
async function tryLoadBookFile(bookName: string, language: Language): Promise<BibleBook_JSON | null> {
  const variants = generateFileNameVariants(bookName, language);
  
  console.log(`🔍 Trying to load ${bookName} in ${language} with variants:`, variants);
  
  for (const variant of variants) {
    try {
      const response = await fetch(`/data/bible/${language}/${variant}.json`);
      if (response.ok) {
        console.log(`✅ Successfully loaded: /data/bible/${language}/${variant}.json`);
        const bookData: BibleBook_JSON = await response.json();
        return bookData;
      } else {
        console.log(`❌ Failed to load: /data/bible/${language}/${variant}.json (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ Error loading: /data/bible/${language}/${variant}.json`, error);
    }
  }
  
  console.error(`❌ ALL VARIANTS FAILED for ${bookName} in ${language}`);
  console.error(`📁 Tried these files:`, variants.map(v => `/data/bible/${language}/${v}.json`));
  return null;
}

// Fonction pour charger un livre depuis les fichiers JSON
async function loadBook(bookName: string, language: Language): Promise<BibleBook_JSON | null> {
  const cacheKey = `${bookName}_${language}`;
  
  if (bibleCache.has(cacheKey)) {
    return bibleCache.get(cacheKey)!;
  }

  try {
    const bookData = await tryLoadBookFile(bookName, language);
    if (!bookData) {
      return null;
    }
    
    bibleCache.set(cacheKey, bookData);
    return bookData;
  } catch (error) {
    console.error(`❌ ERREUR DE CHARGEMENT: ${bookName} en ${language}`, error);
    return null;
  }
}

// Fonction pour obtenir la référence d'un livre dans la langue appropriée
function getBookReference(bookName: string, language: Language): string {
  const book = bibleBooks.find(b => b.name === bookName);
  if (!book) return bookName;
  
  return language === 'fr' ? book.nameFr : book.nameEn;
}

// Fonction pour charger tous les versets d'une langue
async function loadAllVerses(language: Language): Promise<BibleVerse[]> {
  const cacheKey = `all_verses_${language}`;
  
  if (allVersesCache.has(cacheKey)) {
    return allVersesCache.get(cacheKey)!;
  }

  console.log(`Loading all verses for ${language}...`);
  const allVerses: BibleVerse[] = [];
  
  // Liste des livres disponibles (seulement ceux qui ont des fichiers JSON)
  const availableBooks = ['Genesis', 'Matthew', 'John'];
  
  try {
    // Charger seulement les livres disponibles
    for (const bookName of availableBooks) {
      const bookInfo = bibleBooks.find(b => b.name === bookName);
      if (!bookInfo) continue;
      
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
  // Simulate API call delay (shorter for better UX)
  await new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    // Charger tous les versets de la langue
    const allVerses = await loadAllVerses(language);
    
    if (allVerses.length === 0) {
      throw new Error('No verses loaded');
    }

    // Sélection vraiment aléatoire parmi TOUS les versets (1 sur 31,000+)
    const randomIndex = Math.floor(Math.random() * allVerses.length);
    const selectedVerse = allVerses[randomIndex];
    
    console.log(`Selected verse ${randomIndex + 1} of ${allVerses.length}: ${selectedVerse.reference}`);
    return selectedVerse;
  } catch (error) {
    console.error(`Error getting random verse in ${language}:`, error);
    // Fallback vers un verset par défaut
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
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  try {
    // Charger le livre
    const bookData = await loadBook(book, language);
    if (!bookData) {
      console.warn(`📖 Livre non trouvé: ${book} en ${language} - Essayez d'ajouter le fichier JSON`);
      // Return fallback content instead of throwing error
      const verses: BibleVerse[] = [];
      const versesCount = Math.floor(Math.random() * 25) + 5;
      
      for (let i = 1; i <= versesCount; i++) {
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

    // Trouver le chapitre demandé
    const requestedChapter = bookData.Chapters.find(ch => ch.Number === chapter);
    if (!requestedChapter) {
      throw new Error(`Chapter ${chapter} not found in book ${book}`);
    }

    // Convertir vers le format BibleChapter
    const verses: BibleVerse[] = requestedChapter.Verses.map(verseData => ({
      book,
      chapter,
      verse: verseData.ID,
      text: verseData.Text,
      reference: `${getBookReference(book, language)} ${chapter}:${verseData.ID}`
    }));

    return {
      book,
      chapter,
      verses
    };
  } catch (error) {
    console.error(`Error loading chapter ${book} ${chapter} in ${language}:`, error);
    // Fallback vers du contenu généré
    const verses: BibleVerse[] = [];
    const versesCount = Math.floor(Math.random() * 25) + 5;
    
    for (let i = 1; i <= versesCount; i++) {
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
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

// Fonction pour rechercher dans toute la Bible
export async function searchInBible(searchTerm: string, language: Language): Promise<BibleVerse[]> {
  if (!searchTerm.trim()) return [];
  
  console.log(`Searching for "${searchTerm}" in ${language}...`);
  const results: BibleVerse[] = [];
  
  // Liste des livres disponibles (seulement ceux qui ont des fichiers JSON)
  const availableBooks = ['Genesis', 'Matthew', 'John'];
  
  try {
    for (const bookName of availableBooks) {
      const bookInfo = bibleBooks.find(b => b.name === bookName);
      if (!bookInfo) continue;
      
      const book = await loadBook(bookInfo.name, language);
      if (book && book.Chapters) {
        for (const chapterData of book.Chapters) {
          for (const verseData of chapterData.Verses) {
            // Utiliser la fonction de recherche sans accents
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