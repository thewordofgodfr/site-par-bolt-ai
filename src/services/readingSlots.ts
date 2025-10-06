// services/readingSlots.ts
import type { Language } from '../types/bible';

export type SlotId = 'S' | '1' | '2' | '3';

export type ReadingSlot = {
  book: string;       // id interne (ex: 'Matthew')
  chapter: number;    // >= 1
  verse?: number;     // optionnel
  language: Language; // 'fr' | 'en'
  updatedAt: number;  // Date.now()
};

const LS_KEY = 'twog:reading:slots:v1';

type SlotsState = Record<SlotId, ReadingSlot | null>;

function readAll(): SlotsState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { S: null, '1': null, '2': null, '3': null };
    const parsed = JSON.parse(raw);
    return { S: null, '1': null, '2': null, '3': null, ...parsed };
  } catch {
    return { S: null, '1': null, '2': null, '3': null };
  }
}

function writeAll(next: SlotsState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {}
}

export function getReadingSlots(): SlotsState {
  return readAll();
}

export function getReadingSlot(id: SlotId): ReadingSlot | null {
  return readAll()[id] ?? null;
}

export function saveReadingSlot(
  id: SlotId,
  data: { book: string; chapter: number; verse?: number; language: Language }
) {
  const all = readAll();
  all[id] = { ...data, updatedAt: Date.now() };
  writeAll(all);
}

export function clearReadingSlot(id: SlotId) {
  const all = readAll();
  all[id] = null;
  writeAll(all);
}
