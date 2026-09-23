import { HymnLibraryEntry } from '../types/bulletin';

const STORAGE_KEY = 'uploadedHymnLibrary';

export function loadUploadedHymns(): HymnLibraryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HymnLibraryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveUploadedHymns(entries: HymnLibraryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Best-effort — the library still applies for this session even if it
    // can't be persisted (e.g. private browsing).
  }
}

function dedupeKey(entry: HymnLibraryEntry): string {
  return entry.number ? `n:${entry.number}` : `t:${entry.title}`;
}

// Later entries win on a key collision (number if present, else title) —
// re-uploading a song updates it in place instead of duplicating; new songs
// are appended. Used both to layer uploads onto the built-in HYMN_LIBRARY,
// and to fold a fresh upload into the already-uploaded set before saving.
export function mergeHymnLibraries(
  base: HymnLibraryEntry[],
  incoming: HymnLibraryEntry[]
): HymnLibraryEntry[] {
  const order: string[] = [];
  const byKey = new Map<string, HymnLibraryEntry>();

  [...base, ...incoming].forEach((entry) => {
    const key = dedupeKey(entry);
    if (!byKey.has(key)) order.push(key);
    byKey.set(key, entry);
  });

  return order.map((key) => byKey.get(key)!);
}
