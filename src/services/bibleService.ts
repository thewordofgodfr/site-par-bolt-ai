import { BibleVerse, BibleChapter, Language } from '../types/bible';
import { bibleBooks } from '../data/bibleBooks';
import { searchInText } from '../utils/searchUtils';

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

interface VerseCounts {
  [bookName: string]: number[];
}

const bibleCache: Map<string, BibleBook_JSON> = new Map();
const verseCountsCache: Map<string, VerseCounts> = new Map();

function generateFileNameVariants(bookName: string, language: Language): string[] {
  const book = bibleBooks.find(b => b.name === bookName);
  if (!book) return [bookName];

  const baseName = language === 'fr' ? book.nameFr : book.nameEn;
  const variants: string[] = [];

  variants.push(baseName);
  variants.push(baseName.replace(/\s+/g, ''));

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
      continue;
    }
  }
  return null;
}

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
    console.error(`Error loading ${bookName} in ${language}:`, error);
    return null;
  }
}

function getBookReference(bookName: string, language: Language): string {
  const book = bibleBooks.find(b => b.name === bookName);
  if (!book) return bookName;
  return language === 'fr' ? book.nameFr : book.nameEn;
}

async function loadVerseCounts(language: Language): Promise<VerseCounts> {
  const cacheKey = `verse_counts_${language}`;

  if (verseCountsCache.has(cacheKey)) {
    return verseCountsCache.get(cacheKey)!;
  }

  const localStorageKey = `verse_counts_${language}`;
  const cached = localStorage.getItem(localStorageKey);

  if (cached) {
    try {
      const parsedCounts = JSON.parse(cached);
      verseCountsCache.set(cacheKey, parsedCounts);
      return parsedCounts;
    } catch {
      localStorage.removeItem(localStorageKey);
    }
  }

  try {
    const response = await fetch(`/data/bible/${language}/verse-counts.json`);
    if (!response.ok) {
      throw new Error('Failed to load verse-counts.json');
    }

    const verseCounts: VerseCounts = await response.json();
    verseCountsCache.set(cacheKey, verseCounts);
    localStorage.setItem(localStorageKey, JSON.stringify(verseCounts));

    return verseCounts;
  } catch (error) {
    console.error(`Error loading verse counts for ${language}:`, error);
    return {};
  }
}

export async function getRandomVerse(language: Language): Promise<BibleVerse> {
  try {
    const verseCounts = await loadVerseCounts(language);

    if (Object.keys(verseCounts).length === 0) {
      throw new Error('No verse counts loaded');
    }

    let totalVerses = 0;
    for (const chapters of Object.values(verseCounts)) {
      totalVerses += chapters.reduce((sum, count) => sum + count, 0);
    }

    const randomIndex = Math.floor(Math.random() * totalVerses);

    let currentIndex = 0;
    for (const [bookName, chapters] of Object.entries(verseCounts)) {
      for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
        const verseCount = chapters[chapterIndex];

        if (currentIndex + verseCount > randomIndex) {
          const verseInChapter = randomIndex - currentIndex + 1;
          const chapterNumber = chapterIndex + 1;

          const book = await loadBook(bookName, language);
          if (!book) {
            throw new Error(`Book ${bookName} not found`);
          }

          const chapter = book.Chapters.find(ch => ch.Number === chapterNumber);
          if (!chapter) {
            throw new Error(`Chapter ${chapterNumber} not found in ${bookName}`);
          }

          const verse = chapter.Verses.find(v => v.ID === verseInChapter);
          if (!verse) {
            throw new Error(`Verse ${verseInChapter} not found`);
          }

          const bookReference = getBookReference(bookName, language);
          return {
            book: bookName,
            chapter: chapterNumber,
            verse: verseInChapter,
            text: verse.Text,
            reference: `${bookReference} ${chapterNumber}:${verseInChapter}`
          };
        }

        currentIndex += verseCount;
      }
    }

    throw new Error('Random verse calculation failed');
  } catch (error) {
    console.error('Error fetching random verse:', error);
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
  try {
    const bookData = await loadBook(book, language);
  if (!bookData) {
      throw new Error(`Book ${book} not found`);
    }

    const requestedChapter = bookData.Chapters.find(ch => ch.Number === chapter);
    if (!requestedChapter) {
      throw new Error(`Chapter ${chapter} not found in book ${book}`);
    }

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
          ? `❌ Erreur: Fichier manquant pour ${book}`
          : `❌ Error: Missing file for ${book}`,
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

export async function searchInBible(searchTerm: string, language: Language): Promise<BibleVerse[]> {
  if (!searchTerm.trim()) return [];

  // ---- Cache session pour accélérer les recherches répétées
  const key = `twog:search:cache:${language}:${searchTerm.trim().toLowerCase()}`;
  const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

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

    // Mémorise le résultat en session pour réutilisation instantanée
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, JSON.stringify(results));
      }
    } catch {}

    return results;
  } catch (error) {
    console.error(`Error searching in Bible for ${language}:`, error);
    return [];
  }
}

/* ============================
   Warm-up / Pré-chauffage (avec pause & limite)
   ============================ */

// Helper idle (sans SSR)
type IdleDeadline = { timeRemaining: () => number };
type IdleCb = (deadline?: IdleDeadline) => void;
const idle = (cb: IdleCb) => {
  if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
    (window as any).requestIdleCallback(cb as any);
  } else {
    setTimeout(() => cb({ timeRemaining: () => 0 }), 250);
  }
};

// État global du warmup (pausable)
let warmed: Record<Language, boolean> = { fr: false, en: false };
let warmupEnabled = true;
export function pauseWarmup() { warmupEnabled = false; }
export function resumeWarmup() { warmupEnabled = true; }

type WarmOptions = {
  /** Livres par lot (petit = moins d'impact UI) */
  batchSize?: number;
  /** Livres total à charger */
  maxBooks?: number;
  /** Termes à préchauffer (cache de recherche) */
  searchTerms?: string[];
  /** Délai avant de lancer la pré-recherche (ms) */
  presearchDelayMs?: number;
  /** Max de termes à préchauffer */
  presearchMaxTerms?: number;
};

/**
 * Précharge les livres par paquets, avec une petite file d'attente (faible concurrence).
 */
function preloadBooksInBatches(language: Language, batchSize: number, maxBooks: number): Promise<void> {
  const names = bibleBooks.map(b => b.name).slice(0, Math.max(0, maxBooks));
  let index = 0;

  return new Promise<void>(resolve => {
    const step = () => {
      if (!warmupEnabled) return resolve(); // stop net si pause
      if (index >= names.length) return resolve();

      const slice = names.slice(index, index + batchSize);
      index += batchSize;

      // Charge ce lot en SÉRIE (au lieu de Promise.all) pour lisser l'impact CPU/JSON.parse
      const loadNext = async (i: number): Promise<void> => {
        if (i >= slice.length || !warmupEnabled) return;
        try { await loadBook(slice[i], language); } catch {}
        // micro-pause entre 2 livres pour laisser respirer l'UI
        await new Promise(r => setTimeout(r, 10));
        return loadNext(i + 1);
      };

      loadNext(0).finally(() => {
        // Planifie le lot suivant pendant une période idle
        idle(step);
      });
    };

    // Démarre pendant une période idle
    idle(step);
  });
}

/**
 * Pré-chauffe le cache de recherche (sessionStorage) pour quelques mots fréquents.
 * Très léger : 1 terme toutes ~1.2s, stoppable si l'utilisateur navigue.
 */
function prewarmSearchCache(language: Language, terms: string[], maxTerms: number) {
  const list = terms.slice(0, Math.max(0, maxTerms));
  let i = 0;

  const run = () => {
    if (!warmupEnabled) return;         // stop si pause
    if (i >= list.length) return;       // terminé

    const term = list[i++];
    searchInBible(term, language).catch(() => { /* silencieux */ });

    // espace entre 2 recherches pour ne pas impacter l'UI
    setTimeout(() => idle(run), 1200);
  };

  idle(run);
}

/**
 * Version adoucie : petits lots + pause possible + pré-recherche limitée.
 */
export function warmBibleCache(language: Language, opts: WarmOptions = {}) {
  if (warmed[language]) return;
  warmed[language] = true;

  const {
    batchSize = 6,           // ← petits lots (moins d'impact UI)
    maxBooks = 66,           // ← précharge tout en arrière-plan
    searchTerms,
    presearchDelayMs = 3000, // ← on attend 3s avant la pré-recherche
    presearchMaxTerms = 3,   // ← seulement 3 termes (ex: "amour", "Dieu", "Jésus")
  } = opts;

  const defaultTermsFr = ['amour', 'Dieu', 'Jésus', 'foi', 'paix', 'esprit'];
  const defaultTermsEn = ['love', 'God', 'Jesus', 'faith', 'peace', 'spirit'];
  const terms = searchTerms ?? (language === 'fr' ? defaultTermsFr : defaultTermsEn);

  // 1) Compteurs de versets d'abord
  idle(async () => {
    try { await loadVerseCounts(language); } catch {}

    // 2) Précharge des livres par petits lots (en série)
    preloadBooksInBatches(language, batchSize, maxBooks)
      .catch(() => { /* silencieux */ });

    // 3) Pré-recherche ultra légère et différée
    setTimeout(() => {
      if (!warmupEnabled) return;
      prewarmSearchCache(language, terms, presearchMaxTerms);
    }, presearchDelayMs);
  });
}
