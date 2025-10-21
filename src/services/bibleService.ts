// src/services/bibleService.ts — version fichier unique JSONL (FR & EN) + compat warmup
import { BibleVerse, BibleChapter, Language } from '../types/bible';
import { bibleBooks } from '../data/bibleBooks';

/** Structure d'une ligne JSONL */
type VerseRow = { id: string; b: string; c: number; v: number; t: string };

/** Cache du corpus par langue */
const versesCache = new Map<Language, VerseRow[]>();

/** Index chapitres: lang -> codeLivre -> chapitre -> [start,end[ dans versesCache */
type ChapIndex = Map<string, Map<number, [number, number]>>;
const indexCache = new Map<Language, ChapIndex>();

/** Mapping codes VPL <-> noms internes (bibleBooks.name) */
const codeToName: Record<string, string> = {
  // AT
  GEN:'Genesis', EXO:'Exodus', LEV:'Leviticus', NUM:'Numbers', DEU:'Deuteronomy',
  JOS:'Joshua', JDG:'Judges', RUT:'Ruth',
  '1SA':'1Samuel','2SA':'2Samuel','1KI':'1Kings','2KI':'2Kings',
  '1CH':'1Chronicles','2CH':'2Chronicles', EZR:'Ezra', NEH:'Nehemiah',
  EST:'Esther', JOB:'Job', PSA:'Psalms', PRO:'Proverbs', ECC:'Ecclesiastes',
  'SNG':'Song of songs', ISA:'Isaiah', JER:'Jeremiah', LAM:'Lamentations',
  EZK:'Ezekiel', DAN:'Daniel', HOS:'Hosea', JOL:'Joel', AMO:'Amos',
  OBA:'Obadiah', JON:'Jonah', MIC:'Micah', NAM:'Nahum', HAB:'Habakkuk',
  ZEP:'Zephaniah', HAG:'Haggai', ZEC:'Zechariah', MAL:'Malachi',
  // NT
  MAT:'Matthew', MRK:'Mark', LUK:'Luke', JHN:'John', ACT:'Acts', ROM:'Romans',
  '1CO':'1Corinthians','2CO':'2Corinthians', GAL:'Galatians', EPH:'Ephesians',
  PHP:'Philippians', COL:'Colossians', '1TH':'1Thessalonians','2TH':'2Thessalonians',
  '1TI':'1Timothy','2TI':'2Timothy', TIT:'Titus', PHM:'Philemon', HEB:'Hebrews',
  JAM:'James', '1PE':'1Peter','2PE':'2Peter', '1JO':'1John','2JO':'2John','3JO':'3John',
  JUD:'Jude', REV:'Revelation',
};
const nameToCode: Record<string, string> =
  Object.fromEntries(Object.entries(codeToName).map(([k, v]) => [v, k]));

/** Nom d'affichage (FR/EN) */
function getBookReference(bookName: string, language: Language): string {
  const meta = bibleBooks.find(b => b.name === bookName);
  if (!meta) return bookName;
  return language === 'fr' ? meta.nameFr : meta.nameEn;
}

/** Normalisation pour recherche (sans accents, minuscule) */
function fold(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Charge / indexe le fichier unique d'une langue (si pas déjà fait) */
async function ensureLoaded(language: Language): Promise<void> {
  if (versesCache.has(language) && indexCache.has(language)) return;

  const url = `/data/bible/${language}/verses.jsonl`;
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Fichier manquant: ${url}`);
  const txt = await res.text();

  const rows: VerseRow[] = txt.split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
  versesCache.set(language, rows);

  // Construit index: pour chaque (code, chapitre), repère la plage contiguë
  const idx: ChapIndex = new Map();
  rows.forEach((r, i) => {
    let bookMap = idx.get(r.b);
    if (!bookMap) { bookMap = new Map(); idx.set(r.b, bookMap); }
    const cur = bookMap.get(r.c);
    if (!cur) bookMap.set(r.c, [i, i + 1]);
    else cur[1] = i + 1;
  });
  indexCache.set(language, idx);
}

/** Verset aléatoire (tout corpus) */
export async function getRandomVerse(language: Language): Promise<BibleVerse> {
  try {
    await ensureLoaded(language);
    const rows = versesCache.get(language)!;
    const r = rows[Math.floor(Math.random() * rows.length)];
    const bookName = codeToName[r.b] ?? 'John';
    return {
      book: bookName,
      chapter: r.c,
      verse: r.v,
      text: r.t,
      reference: `${getBookReference(bookName, language)} ${r.c}:${r.v}`,
    };
  } catch (e) {
    console.error('Error fetching random verse:', e);
    return {
      book: 'John',
      chapter: 3,
      verse: 16,
      text: language === 'fr'
        ? 'Car Dieu a tant aimé le monde qu\'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu\'il ait la vie éternelle.'
        : 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
      reference: language === 'fr' ? 'Jean 3:16' : 'John 3:16',
    };
  }
}

/** Lecture d'un chapitre */
export async function getChapter(bookName: string, chapter: number, language: Language): Promise<BibleChapter> {
  try {
    await ensureLoaded(language);
    const rows = versesCache.get(language)!;
    const idx = indexCache.get(language)!;

    const code = nameToCode[bookName];
    if (!code) throw new Error(`Livre inconnu: ${bookName}`);

    const bookMap = idx.get(code);
    if (!bookMap) throw new Error(`Index absent pour ${code}`);
    const span = bookMap.get(chapter);
    if (!span) throw new Error(`Chapitre ${chapter} introuvable dans ${bookName}`);

    const [start, end] = span;
    const verses: BibleVerse[] = [];
    for (let i = start; i < end; i++) {
      const r = rows[i];
      if (r.c !== chapter) continue;
      verses.push({
        book: bookName,
        chapter,
        verse: r.v,
        text: r.t,
        reference: `${getBookReference(bookName, language)} ${chapter}:${r.v}`,
      });
    }
    return { book: bookName, chapter, verses };
  } catch (error) {
    console.error(`Error loading chapter ${bookName} ${chapter} in ${language}:`, error);
    const verses: BibleVerse[] = [];
    for (let i = 1; i <= 10; i++) {
      verses.push({
        book: bookName,
        chapter,
        verse: i,
        text: language === 'fr'
          ? `❌ Erreur: Données manquantes pour ${bookName}`
          : `❌ Error: Missing data for ${bookName}`,
        reference: `${getBookReference(bookName, language)} ${chapter}:${i}`,
      });
    }
    return { book: bookName, chapter, verses };
  }
}

/** Recherche accent-insensible, sur tout le corpus */
export async function searchInBible(searchTerm: string, language: Language): Promise<BibleVerse[]> {
  const q = searchTerm.trim();
  if (!q) return [];
  await ensureLoaded(language);

  // Cache session simple
  const key = `twog:search:cache:${language}:${q.toLowerCase()}`;
  try {
    const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    if (cached) return JSON.parse(cached);
  } catch {}

  const fq = fold(q);
  const rows = versesCache.get(language)!;
  const out: BibleVerse[] = [];
  for (const r of rows) {
    if (fold(r.t).includes(fq)) {
      const bookName = codeToName[r.b] ?? 'John';
      out.push({
        book: bookName,
        chapter: r.c,
        verse: r.v,
        text: r.t,
        reference: `${getBookReference(bookName, language)} ${r.c}:${r.v}`,
      });
    }
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, JSON.stringify(out));
    }
  } catch {}
  return out;
}

/** Métadonnées livres (inchangé) */
export function getBibleBooks() {
  return bibleBooks;
}

/** Presse-papiers */
export async function copyToClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/* ---- Warm-up (compat avec ancien code) ---- */
type IdleDeadline = { timeRemaining: () => number };
type IdleCb = (deadline?: IdleDeadline) => void;
const idle = (cb: IdleCb) => {
  if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
    (window as any).requestIdleCallback(cb as any);
  } else { setTimeout(() => cb({ timeRemaining: () => 0 }), 250); }
};

/** anciens drapeaux, pour compat */
let warmed: Record<Language, boolean> = { fr: false, en: false };
let warmupEnabled = true;

export function pauseWarmup() { warmupEnabled = false; }
export function resumeWarmup() { warmupEnabled = true; }

/** Précharge le JSONL en arrière-plan si autorisé */
export function warmBibleCache(language: Language) {
  if (warmed[language]) return;
  warmed[language] = true;
  idle(() => {
    if (!warmupEnabled) return;
    ensureLoaded(language).catch(() => {});
  });
}
