import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { getBibleBooks, searchInBible } from '../services/bibleService';
import type { BibleVerse } from '../types/bible';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Search as SearchIcon,
  X,
} from 'lucide-react';
import { saveSlot as saveQuickSlot } from '../services/readingSlots';

/* -------- Types -------- */

type ResultItem = BibleVerse & { occ: number };

type Grouped = {
  bookId: string;
  displayName: string;
  verses: ResultItem[];
  occ: number; // total occurrences in this book
};

/* ========= Utils (accents/ligatures, préfixe, etc.) ========= */

function normalizeLigatures(s: string) {
  return s.replace(/œ/g, 'oe').replace(/Œ/g, 'oe').replace(/æ/g, 'ae').replace(/Æ/g, 'ae');
}

function normalizeForSearch(s: string) {
  const noLig = normalizeLigatures(s);
  const deAccented = noLig.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return deAccented
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildNormalizedWithMap(input: string) {
  const src = normalizeLigatures(input);
  const normChars: string[] = [];
  const idxMap: number[] = [];
  let lastWasSpace = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let emitted = false;
    for (let k = 0; k < base.length; k++) {
      const c = base[k];
      if (/[A-Za-z0-9]/.test(c)) {
        normChars.push(c.toLowerCase());
        idxMap.push(i);
        emitted = true;
        lastWasSpace = false;
      }
    }
    if (!emitted) {
      if (!lastWasSpace) {
        normChars.push(' ');
        idxMap.push(i);
        lastWasSpace = true;
      }
    }
  }

  let start = 0;
  while (start < normChars.length && normChars[start] === ' ') start++;
  let end = normChars.length;
  while (end > start && normChars[end - 1] === ' ') end--;

  const norm = normChars.slice(start, end).join('');
  const map = idxMap.slice(start, end);
  return { norm, map };
}

/** Match “flexible” :
 *  - si la requête se termine par un espace → expression exacte (mots entiers)
 *  - sinon → dernier mot en *préfixe* (ex: "conspi" → "conspiration")
 *  - insensible aux accents/ligatures/casse
 */
function matchesFlexible(text: string, query: string) {
  const normText = normalizeForSearch(text);
  const normQuery = normalizeForSearch(query);
  if (!normQuery) return false;

  const endsWithSpace = /\s$/.test(query);
  const paddedText = ` ${normText} `;

  if (endsWithSpace) {
    // mots entiers
    return paddedText.includes(` ${normQuery} `);
  }
  // préfixe du dernier mot (et plus généralement: début de mot)
  return paddedText.includes(` ${normQuery}`);
}

/** Compte le nombre d’occurrences selon la même logique que matchesFlexible */
function countMatchesFlexible(text: string, query: string): number {
  const normQuery = normalizeForSearch(query);
  if (!normQuery) return 0;

  const { norm } = buildNormalizedWithMap(text);
  if (!norm) return 0;

  const endsWithSpace = /\s$/.test(query);
  const haystack = endsWithSpace ? ` ${norm} ` : ` ${norm}`;
  const needle   = endsWithSpace ? ` ${normQuery} ` : ` ${normQuery}`;

  let from = 0;
  let count = 0;
  while (true) {
    const pos = haystack.indexOf(needle, from);
    if (pos === -1) break;
    count++;
    from = pos + needle.length; // pas de chevauchement attendu (séparateurs = espaces)
  }
  return count;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Surlignage aligné sur matchesFlexible */
function highlightFlexible(text: string, query: string) {
  const normQuery = normalizeForSearch(query);
  if (!normQuery) return escapeHtml(text);

  const { norm, map } = buildNormalizedWithMap(text);
  if (!norm) return escapeHtml(text);

  const endsWithSpace = /\s$/.test(query);
  const padded = ` ${norm}`; // pas d’espace final ici
  const needle = endsWithSpace ? ` ${normQuery} ` : ` ${normQuery}`;

  const matches: Array<{ start: number; end: number }> = [];
  let from = 0;
  while (true) {
    const pos = padded.indexOf(needle, from);
    if (pos === -1) break;
    const startInNorm = pos;
    const endInNorm = pos + normQuery.length; // exclusif
    matches.push({ start: startInNorm, end: endInNorm });
    from = pos + needle.length;
  }
  if (!matches.length) return escapeHtml(text);

  // Conversion → indices d’origine
  const ranges = matches
    .map(({ start, end }) => {
      const origStart = map[Math.max(0, start)];
      const origEnd = (map[Math.min(map.length - 1, end - 1)] ?? map[map.length - 1]) + 1; // exclu
      return { start: origStart, end: origEnd };
    })
    .sort((a, b) => a.start - b.start);

  // Fusion des recouvrements
  const merged: typeof ranges = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (!last || r.start > last.end) merged.push({ ...r });
    else last.end = Math.max(last.end, r.end);
  }

  // Construction HTML
  let html = '';
  let cursor = 0;
  for (const r of merged) {
    if (cursor < r.start) html += escapeHtml(text.slice(cursor, r.start));
    html += `<mark>${escapeHtml(text.slice(r.start, r.end))}</mark>`;
    cursor = r.end;
  }
  if (cursor < text.length) html += escapeHtml(text.slice(cursor));
  return html;
}

/* ====================== Composant ====================== */

export default function Search() {
  const { state, navigateToVerse } = useApp();
  const isDark = state.settings.theme === 'dark';

  const queryKey = `twog:search:lastQuery:${state.settings.language}`;
  const expandedKey = (q: string) =>
    `twog:search:expanded:${state.settings.language}:${q.trim().toLowerCase()}`;
  const scrollKey = (q: string) =>
    `twog:search:scroll:${state.settings.language}:${q.trim().toLowerCase()}`;

  const [query, setQuery] = useState<string>('');
  useEffect(() => {
    const saved = sessionStorage.getItem(queryKey);
    if (saved) setQuery(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings.language]);
  useEffect(() => {
    sessionStorage.setItem(queryKey, query);
  }, [query, queryKey]);

  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const books = useMemo(() => getBibleBooks(), []);
  const getBookName = (id: string) => {
    const b = books.find(x => x.name === id);
    if (!b) return id;
    return state.settings.language === 'fr' ? b.nameFr : b.nameEn;
  };
  const bibleOrder = (id: string) => {
    const idx = books.findIndex(b => b.name === id);
    return idx === -1 ? 9999 : idx;
  };

  // Titre de page
  useEffect(() => {
    document.title = state.settings.language === 'fr' ? 'Recherche biblique' : 'Bible Search';
  }, [state.settings.language]);

  // Lancer la recherche (debounce)
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        // Moissonnage côté service
        const res = await searchInBible(query, state.settings.language);
        // Enrichissement avec le nombre d'occurrences, puis filtrage
        const enriched: ResultItem[] = [];
        for (const v of res) {
          const occ = countMatchesFlexible(v.text, query);
          if (occ > 0) enriched.push({ ...v, occ });
        }
        setResults(enriched);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, state.settings.language]);

  // Groupement par livre + somme des occurrences
  const grouped: Grouped[] = useMemo(() => {
    const map = new Map<string, ResultItem[]>();
    for (const v of results) {
      if (!map.has(v.book)) map.set(v.book, []);
      map.get(v.book)!.push(v);
    }
    const arr: Grouped[] = Array.from(map.entries()).map(([bookId, verses]) => ({
      bookId,
      displayName: getBookName(bookId),
      verses: verses.sort((a, b) =>
        a.chapter === b.chapter ? a.verse - b.verse : a.chapter - b.chapter
      ),
      occ: verses.reduce((s, x) => s + x.occ, 0),
    }));
    arr.sort((a, b) => bibleOrder(a.bookId) - bibleOrder(b.bookId));
    return arr;
  }, [results, state.settings.language, books]);

  // Restauration états d’ouverture
  useEffect(() => {
    if (!grouped.length) {
      setExpanded({});
      return;
    }
    let restored: Record<string, boolean> | null = null;
    try {
      const raw = sessionStorage.getItem(expandedKey(query));
      if (raw) restored = JSON.parse(raw);
    } catch {
      restored = null;
    }
    if (restored && Object.keys(restored).length) {
      const next: Record<string, boolean> = {};
      for (const g of grouped) next[g.bookId] = !!restored[g.bookId];
      setExpanded(next);
    } else {
      const open = grouped.length <= 2;
      const next: Record<string, boolean> = {};
      for (const g of grouped) next[g.bookId] = open;
      setExpanded(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped, query, state.settings.language]);

  useEffect(() => {
    if (!grouped.length) return;
    try {
      sessionStorage.setItem(expandedKey(query), JSON.stringify(expanded));
    } catch {}
  }, [expanded, grouped, query, state.settings.language]);

  // Restauration du scroll
  useEffect(() => {
    if (!grouped.length || loading) return;
    const raw = sessionStorage.getItem(scrollKey(query));
    const y = raw ? parseInt(raw, 10) : 0;
    if (Number.isFinite(y) && y > 0) {
      setTimeout(() => window.scrollTo({ top: y, behavior: 'auto' }), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped, loading, query, state.settings.language]);

  useEffect(() => {
    const save = () => sessionStorage.setItem(scrollKey(query), String(window.scrollY || 0));
    window.addEventListener('beforeunload', save);
    return () => {
      save();
      window.removeEventListener('beforeunload', save);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, state.settings.language]);

  const toggleGroup = (bookId: string) =>
    setExpanded(prev => ({ ...prev, [bookId]: !prev[bookId] }));
  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const g of grouped) next[g.bookId] = true;
    setExpanded(next);
  };
  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    for (const g of grouped) next[g.bookId] = false;
    setExpanded(next);
  };
  const clearQuery = () => {
    setQuery('');
    setResults([]);
    sessionStorage.removeItem(scrollKey(query));
  };

  const openInReading = (v: ResultItem) => {
    try { saveQuickSlot(0, { book: v.book, chapter: v.chapter, verse: v.verse }); } catch {}
    sessionStorage.setItem(scrollKey(query), String(window.scrollY || 0));
    navigateToVerse(v.book, v.chapter, v.verse);
  };

  const totalOccurrences = useMemo(
    () => results.reduce((s, v) => s + v.occ, 0),
    [results]
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors`}>
      <div className="max-w-4xl mx-auto px-4 py-5">
        {/* En-tête / titre */}
        <h1 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {state.settings.language === 'fr' ? 'Recherche' : 'Search'}
        </h1>

        {/* Petit masque collant */}
        <div
          className={`sticky top-0 z-20 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
          style={{ height: 8 }}
          aria-hidden
        />

        {/* Barre de recherche (sticky) */}
        <div
          className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow border ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          } p-3 sticky top-20 sm:top-16 z-30`}
        >
          <form onSubmit={e => e.preventDefault()} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className={isDark ? 'text-white/70' : 'text-gray-500'} size={18} />
            </div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              type="text"
              placeholder={
                state.settings.language === 'fr'
                  ? 'Tapez votre recherche'
                  : 'Type your search'
              }
              className={`w-full pl-10 pr-20 py-3 rounded-lg border-2 focus:outline-none transition ${
                isDark
                  ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              }`}
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center space-x-1">
              {!!query && (
                <button
                  type="button"
                  onClick={clearQuery}
                  className={`p-2 rounded-lg ${
                    isDark
                      ? 'text-white/80 hover:text-white hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label={state.settings.language === 'fr' ? 'Effacer' : 'Clear'}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </form>

          {/* Ligne d’infos + actions — une seule ligne */}
          <div className="mt-2 text-sm flex items-center justify-between gap-2">
            <div className={`${isDark ? 'text-white' : 'text-gray-600'} flex-1 min-w-0 truncate`}>
              {loading ? (
                <>
                  <Loader2 className="inline mr-2 animate-spin" size={16} />
                  {state.settings.language === 'fr' ? 'Recherche en cours…' : 'Searching…'}
                </>
              ) : query.trim().length >= 2 ? (
                <>
                  {state.settings.language === 'fr' ? 'Résultats' : 'Results'} "{query}"
                  {' '}({totalOccurrences})
                </>
              ) : (
                state.settings.language === 'fr'
                  ? 'Saisissez au moins 2 caractères pour lancer la recherche.'
                  : 'Type at least 2 characters to search.'
              )}
            </div>

            {grouped.length > 1 && totalOccurrences > 0 && !loading && (
              <div className="flex flex-shrink-0 space-x-2">
                <button
                  onClick={expandAll}
                  className="text-xs px-2 py-1 rounded border border-transparent bg-blue-600 text-white hover:bg-blue-500"
                >
                  {state.settings.language === 'fr' ? 'Tout ouvrir' : 'Expand all'}
                </button>
                <button
                  onClick={collapseAll}
                  className={`text-xs px-2 py-1 rounded ${
                    isDark
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {state.settings.language === 'fr' ? 'Tout fermer' : 'Collapse all'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Résultats */}
        <div className="mt-4">
          {totalOccurrences === 0 && !loading && query.trim().length >= 2 && (
            <div className={`${isDark ? 'text-white' : 'text-gray-600'} text-center py-10`}>
              {state.settings.language === 'fr' ? 'Aucun verset trouvé.' : 'No verses found.'}
            </div>
          )}

          {grouped.map(group => {
            const open = !!expanded[group.bookId];

            return (
              <div
                key={group.bookId}
                className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg mb-3 overflow-hidden`}
              >
                <button
                  onClick={() => toggleGroup(group.bookId)}
                  className={`w-full flex items-center justify-between px-4 py-3 ${isDark ? 'text-white' : 'text-gray-800'}`}
                  aria-expanded={open}
                >
                  <div className="flex items-center">
                    {open ? (
                      <ChevronDown className={`mr-2 ${isDark ? 'text-white/80' : 'text-gray-500'}`} size={18} />
                    ) : (
                      <ChevronRight className={`mr-2 ${isDark ? 'text-white/80' : 'text-gray-500'}`} size={18} />
                    )}
                    <span className="font-semibold">{group.displayName}</span>
                  </div>
                  <span className={`${isDark ? 'text-white/80' : 'text-gray-600'}`}>({group.occ})</span>
                </button>

                {open && (
                  <div className="px-4 pb-3 space-y-3">
                    {group.verses.map(v => {
                      const key = `${v.book}-${v.chapter}-${v.verse}`;
                      return (
                        <div
                          key={key}
                          role="button"
                          tabIndex={0}
                          onClick={() => openInReading(v)}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openInReading(v)}
                          className={`${isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} cursor-pointer rounded-md p-3 border ${isDark ? 'border-gray-700' : 'border-gray-200'} transition`}
                          title={state.settings.language === 'fr' ? 'Ouvrir dans Lecture' : 'Open in Reading'}
                        >
                          <div className={`${isDark ? 'text-blue-300' : 'text-blue-700'} font-medium mb-1 flex items-center gap-2`}>
                            <span>{getBookName(v.book)} {v.chapter}:{v.verse}</span>
                            {v.occ > 1 && (
                              <span className={`${isDark ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'} text-[11px] px-1.5 py-0.5 rounded`}>
                                ({v.occ})
                              </span>
                            )}
                          </div>
                          <div
                            className={isDark ? 'text-white' : 'text-gray-700'}
                            style={{ fontSize: `${state.settings.fontSize}px`, lineHeight: '1.7' }}
                            dangerouslySetInnerHTML={{ __html: highlightFlexible(v.text, query) }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

