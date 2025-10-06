// src/utils/readingSlots.ts
export type QuickSlot = { book: string; chapter: number; verse?: number; updatedAt: number } | null;

const KEY = 'twog:reading:slots:v1';

export function getSlots(): QuickSlot[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [null, null, null, null];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [null, null, null, null];
    return [0, 1, 2, 3].map(i => (arr[i] ?? null));
  } catch {
    return [null, null, null, null];
  }
}

function saveSlots(slots: QuickSlot[]) {
  try { localStorage.setItem(KEY, JSON.stringify(slots)); } catch {}
}

export function readSlot(i: number): QuickSlot {
  return getSlots()[i] ?? null;
}

export function saveSlot(i: number, data: { book: string; chapter: number; verse?: number }) {
  const slots = getSlots();
  slots[i] = { ...data, updatedAt: Date.now() };
  saveSlots(slots);
}

export function clearSlot(i: number) {
  const slots = getSlots();
  slots[i] = null;
  saveSlots(slots);
}
