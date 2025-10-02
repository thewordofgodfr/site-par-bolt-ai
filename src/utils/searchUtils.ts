// Utility functions for text search without accents

/** Remove accents/diacritics and lowercase the string. */
export function removeAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Highlight all occurrences of the searchTerm inside text.
 * - Accent-insensitive (é == e, etc.)
 * - Case-insensitive
 * - Multi-words supported
 * - Overlapping matches merged to avoid nested/duplicated <mark>
 *
 * Returns HTML with <mark>…</mark> wrappers.
 */
export function highlightText(text: string, searchTerm: string): string {
  const raw = text ?? '';
  const term = (searchTerm ?? '').trim();
  if (!term) return raw;

  const normText = removeAccents(raw);
  const words = removeAccents(term).split(/\s+/).filter(Boolean);
  if (words.length === 0) return raw;

  type Range = { start: number; end: number };
  const ranges: Range[] = [];

  // Collect all match ranges (on normalized text) for every word
  for (const w of words) {
    let from = 0;
    while (from <= normText.length) {
      const idx = normText.indexOf(w, from);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + w.length });
      from = idx + w.length;
    }
  }

  if (ranges.length === 0) return raw;

  // Sort by start, then merge overlapping/adjacent ranges
  ranges.sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const r of ranges) {
    if (merged.length === 0) {
      merged.push({ ...r });
      continue;
    }
    const last = merged[merged.length - 1];
    if (r.start <= last.end) {
      // overlap/adjacent -> extend
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  // Build HTML output from merged ranges (indices map to original text as we
  // computed them on removeAccents(text), which preserves string length per char)
  let out = '';
  let cursor = 0;
  for (const { start, end } of merged) {
    // clamp to bounds (defensive)
    const s = Math.max(0, Math.min(start, raw.length));
    const e = Math.max(0, Math.min(end, raw.length));
    if (cursor < s) out += raw.slice(cursor, s);
    const originalSlice = raw.slice(s, e);
    out += `<mark class="bg-yellow-200 dark:bg-yellow-600 px-1 rounded">${originalSlice}</mark>`;
    cursor = e;
  }
  if (cursor < raw.length) out += raw.slice(cursor);

  return out;
}

/**
 * Accent-insensitive test: returns true if *all* words from searchTerm
 * are found somewhere in text.
 */
export function searchInText(text: string, searchTerm: string): boolean {
  const term = (searchTerm ?? '').trim();
  if (!term) return false;

  const normalizedText = removeAccents(text ?? '');
  const searchWords = removeAccents(term).split(/\s+/).filter(Boolean);

  return searchWords.every(word => normalizedText.includes(word));
}
