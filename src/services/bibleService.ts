import { BibleVerse, BibleChapter, Language } from '../types/bible';
import { bibleBooks } from '../data/bibleBooks';

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

// Mapping des noms de livres anglais vers les noms de fichiers
const bookFileMapping: Record<string, { fr: string; en: string }> = {
  'Genesis': { fr: 'Genèse', en: 'Genesis' },
  'Exodus': { fr: 'Exode', en: 'Exodus' },
  'Leviticus': { fr: 'Lévitique', en: 'Leviticus' },
  'Numbers': { fr: 'Nombres', en: 'Numbers' },
  'Deuteronomy': { fr: 'Deutéronome', en: 'Deuteronomy' },
  'Joshua': { fr: 'Josué', en: 'Joshua' },
  'Judges': { fr: 'Juges', en: 'Judges' },
  'Ruth': { fr: 'Ruth', en: 'Ruth' },
  '1Samuel': { fr: '1 Samuel', en: '1 Samuel' },
  '2Samuel': { fr: '2 Samuel', en: '2 Samuel' },
  '1Kings': { fr: '1 Rois', en: '1 Kings' },
  '2Kings': { fr: '2 Rois', en: '2 Kings' },
  '1Chronicles': { fr: '1 Chroniques', en: '1 Chronicles' },
  '2Chronicles': { fr: '2 Chroniques', en: '2 Chronicles' },
  'Ezra': { fr: 'Esdras', en: 'Ezra' },
  'Nehemiah': { fr: 'Néhémie', en: 'Nehemiah' },
  'Esther': { fr: 'Esther', en: 'Esther' },
  'Job': { fr: 'Job', en: 'Job' },
  'Psalms': { fr: 'Psaumes', en: 'Psalms' },
  'Proverbs': { fr: 'Proverbes', en: 'Proverbs' },
  'Ecclesiastes': { fr: 'Ecclésiaste', en: 'Ecclesiastes' },
  'SongOfSongs': { fr: 'Cantique des cantiques', en: 'Song of Solomon' },
  'Isaiah': { fr: 'Ésaïe', en: 'Isaiah' },
  'Jeremiah': { fr: 'Jérémie', en: 'Jeremiah' },
  'Lamentations': { fr: 'Lamentations', en: 'Lamentations' },
  'Ezekiel': { fr: 'Ézéchiel', en: 'Ezekiel' },
  'Daniel': { fr: 'Daniel', en: 'Daniel' },
  'Hosea': { fr: 'Osée', en: 'Hosea' },
  'Joel': { fr: 'Joël', en: 'Joel' },
  'Amos': { fr: 'Amos', en: 'Amos' },
  'Obadiah': { fr: 'Abdias', en: 'Obadiah' },
  'Jonah': { fr: 'Jonas', en: 'Jonah' },
  'Micah': { fr: 'Michée', en: 'Micah' },
  'Nahum': { fr: 'Nahum', en: 'Nahum' },
  'Habakkuk': { fr: 'Habacuc', en: 'Habakkuk' },
  'Zephaniah': { fr: 'Sophonie', en: 'Zephaniah' },
  'Haggai': { fr: 'Aggée', en: 'Haggai' },
  'Zechariah': { fr: 'Zacharie', en: 'Zechariah' },
  'Malachi': { fr: 'Malachie', en: 'Malachi' },
  'Matthew': { fr: 'Matthieu', en: 'Matthew' },
  'Mark': { fr: 'Marc', en: 'Mark' },
  'Luke': { fr: 'Luc', en: 'Luke' },
  'John': { fr: 'Jean', en: 'John' },
  'Acts': { fr: 'Actes', en: 'Acts' },
  'Romans': { fr: 'Romains', en: 'Romans' },
  '1Corinthians': { fr: '1 Corinthiens', en: '1 Corinthians' },
  '2Corinthians': { fr: '2 Corinthiens', en: '2 Corinthians' },
  'Galatians': { fr: 'Galates', en: 'Galatians' },
  'Ephesians': { fr: 'Éphésiens', en: 'Ephesians' },
  'Philippians': { fr: 'Philippiens', en: 'Philippians' },
  'Colossians': { fr: 'Colossiens', en: 'Colossians' },
  '1Thessalonians': { fr: '1 Thessaloniciens', en: '1 Thessalonians' },
  '2Thessalonians': { fr: '2 Thessaloniciens', en: '2 Thessalonians' },
  '1Timothy': { fr: '1 Timothée', en: '1 Timothy' },
  '2Timothy': { fr: '2 Timothée', en: '2 Timothy' },
  'Titus': { fr: 'Tite', en: 'Titus' },
  'Philemon': { fr: 'Philémon', en: 'Philemon' },
  'Hebrews': { fr: 'Hébreux', en: 'Hebrews' },
  'James': { fr: 'Jacques', en: 'James' },
  '1Peter': { fr: '1 Pierre', en: '1 Peter' },
  '2Peter': { fr: '2 Pierre', en: '2 Peter' },
  '1John': { fr: '1 Jean', en: '1 John' },
  '2John': { fr: '2 Jean', en: '2 John' },
  '3John': { fr: '3 Jean', en: '3 John' },
  'Jude': { fr: 'Jude', en: 'Jude' },
  'Revelation': { fr: 'Apocalypse', en: 'Revelation' }
};

// Fonction pour charger un livre depuis les fichiers JSON
async function loadBook(bookName: string, language: Language): Promise<BibleBook_JSON | null> {
  const cacheKey = `${bookName}_${language}`;
  
  if (bibleCache.has(cacheKey)) {
    return bibleCache.get(cacheKey)!;
  }

  try {
    const fileName = bookFileMapping[bookName]?.[language];
    if (!fileName) {
      console.error(`No file mapping found for book: ${bookName} in ${language}`);
      return null;
    }

    const response = await fetch(`/data/bible/${language}/${fileName}.json`);
    if (!response.ok) {
      console.error(`Failed to load book: ${fileName} in ${language}`);
      return null;
    }

    const bookData: BibleBook_JSON = await response.json();
    bibleCache.set(cacheKey, bookData);
    return bookData;
  } catch (error) {
    console.error(`Error loading book ${bookName} in ${language}:`, error);
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
  
  try {
    // Charger tous les livres de la Bible
    for (const bookInfo of bibleBooks) {
      const book = await loadBook(bookInfo.name, language);
      if (book && book.Chapters) {
        for (const chapter of book.Chapters) {
          for (const verse of chapter.Verses) {
            const bookReference = getBookReference(bookInfo.name, language);
            allVerses.push({
              book: bookInfo.name,
              chapter: chapter.Number,
              verse: verse.ID,
              text: verse.Text,
              reference: `${bookReference} ${chapter.Number}:${verse.ID}`
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
      throw new Error(`Could not load book: ${book} in ${language}`);
    }

    // Trouver le chapitre demandé
    const requestedChapter = bookData.Chapters.find(ch => ch.Number === chapter);
    if (!requestedChapter) {
      throw new Error(`Chapter ${chapter} not found in book ${book}`);
    }

    // Convertir vers le format BibleChapter
    const verses: BibleVerse[] = requestedChapter.Verses.map(verse => ({
      book,
      chapter,
      verse: verse.ID,
      text: verse.Text,
      reference: `${getBookReference(book, language)} ${chapter}:${verse.ID}`
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
          ? `Erreur de chargement - Verset ${i} du chapitre ${chapter} de ${book}.`
          : `Loading error - Verse ${i} of chapter ${chapter} of ${book}.`,
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