import { bibleBooks } from '../src/data/bibleBooks.js';
import * as fs from 'fs';
import * as path from 'path';

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

function generateFileNameVariants(bookName: string, language: 'en' | 'fr'): string[] {
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

  return [...new Set(variants)];
}

async function loadBookFile(bookName: string, language: 'en' | 'fr'): Promise<BibleBook_JSON | null> {
  const variants = generateFileNameVariants(bookName, language);

  for (const variant of variants) {
    const filePath = path.join(process.cwd(), 'public', 'data', 'bible', language, `${variant}.json`);

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
      }
    }
  }

  return null;
}

async function generateVerseCountsForLanguage(language: 'en' | 'fr'): Promise<VerseCounts> {
  const verseCounts: VerseCounts = {};

  console.log(`\n📖 Generating verse counts for ${language.toUpperCase()}...`);

  for (const bookInfo of bibleBooks) {
    const book = await loadBookFile(bookInfo.name, language);

    if (!book || !book.Chapters) {
      console.log(`   ⚠️  Skipping ${bookInfo.name} (file not found)`);
      continue;
    }

    const chapterVerseCounts: number[] = [];

    for (const chapter of book.Chapters) {
      chapterVerseCounts.push(chapter.Verses.length);
    }

    verseCounts[bookInfo.name] = chapterVerseCounts;
    console.log(`   ✅ ${bookInfo.name}: ${chapterVerseCounts.length} chapters`);
  }

  return verseCounts;
}

async function generateVerseCountsFiles() {
  console.log('🚀 Starting verse counts generation...');

  const languages: Array<'en' | 'fr'> = ['en', 'fr'];

  for (const lang of languages) {
    try {
      const verseCounts = await generateVerseCountsForLanguage(lang);

      const outputDir = path.join(process.cwd(), 'public', 'data', 'bible', lang);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, 'verse-counts.json');
      fs.writeFileSync(outputPath, JSON.stringify(verseCounts, null, 2), 'utf-8');

      const totalVerses = Object.values(verseCounts).reduce(
        (sum, chapters) => sum + chapters.reduce((a, b) => a + b, 0),
        0
      );

      const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(2);

      console.log(`\n✨ ${lang.toUpperCase()} verse-counts.json created!`);
      console.log(`   📍 Location: ${outputPath}`);
      console.log(`   📊 Total verses: ${totalVerses}`);
      console.log(`   💾 File size: ${fileSizeKB} KB`);
    } catch (error) {
      console.error(`\n❌ Error generating ${lang} verse counts:`, error);
    }
  }

  console.log('\n✅ Verse counts generation complete!');
}

generateVerseCountsFiles()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  });

