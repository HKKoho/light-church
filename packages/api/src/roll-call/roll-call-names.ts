// packages/api/src/roll-call/roll-call-names.ts
//
// On-server name matching: spots likely duplicates in a member list and
// matches names read from a sign-in sheet to members. No model involved.

/** Lowercase, width-fold, strip punctuation/spaces; Latin words sorted. */
export function normalizeName(name: string): string {
  const folded = name.normalize('NFKC').toLowerCase().trim();
  const words = folded.split(/[\s,.\-_/()'’·]+/).filter(Boolean);
  const latin = words.every((w) => /^[a-z0-9]+$/.test(w));
  return (latin ? [...words].sort() : words).join('');
}

export function levenshtein(a: string, b: string): number {
  const as = Array.from(a);
  const bs = Array.from(b);
  let prev = Array.from({ length: bs.length + 1 }, (_, j) => j);
  for (let i = 1; i <= as.length; i++) {
    const cur = [i];
    for (let j = 1; j <= bs.length; j++) {
      cur[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (cur[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (as[i - 1] === bs[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[bs.length] ?? 0;
}

const isCjk = (s: string) => /\p{Script=Han}/u.test(s);

/**
 * 0–1 likelihood that two names are the same person, using spelling alone.
 * Cross-script pairs (陳大文 / Chan Tai Man) score 0 — only the local model
 * can judge those.
 */
export function nameSimilarity(a: string, b: string): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (isCjk(x) !== isCjk(y)) return 0;
  const len = Math.max(Array.from(x).length, Array.from(y).length);
  const dist = levenshtein(x, y);
  if (isCjk(x)) {
    // Chinese names are short: one differing character in 3+ is only "possible".
    return len >= 3 && dist === 1 ? 0.7 : 0;
  }
  const score = 1 - dist / len;
  return len >= 4 && score >= 0.75 ? score : 0;
}

export interface NamedItem {
  readonly id: string;
  readonly name: string;
}

export interface NamePair<T extends NamedItem> {
  readonly a: T;
  readonly b: T;
  readonly score: number;
}

export const DUPLICATE_THRESHOLD = 0.7;
export const MATCH_THRESHOLD = 0.75;

export function findDuplicates<T extends NamedItem>(items: readonly T[]): NamePair<T>[] {
  const pairs: NamePair<T>[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (!a || !b) continue;
      const score = nameSimilarity(a.name, b.name);
      if (score >= DUPLICATE_THRESHOLD) pairs.push({ a, b, score });
    }
  }
  return pairs.sort((p, q) => q.score - p.score);
}

/** The member a written name most likely refers to, if any. */
export function bestMatch<T extends NamedItem>(
  text: string,
  items: readonly T[],
): { item: T; score: number } | null {
  let best: { item: T; score: number } | null = null;
  for (const item of items) {
    const score = nameSimilarity(text, item.name);
    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) best = { item, score };
  }
  return best;
}

/** How a Chinese name may be written in other forms (from the local model). */
export interface NameForms {
  readonly traditional: string;
  readonly romanised: readonly string[];
}

const latinWords = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * 0–1 likelihood that an English-letter name is a romanisation of a Chinese
 * name: the same words in any order (e.g. "Chan Tai Man" / "Tai-man Chan"),
 * the romanised words plus an English name ("Peter Chan Tai Man"), or a
 * near-spelling. Sharing only a surname never counts.
 */
export function romanisedSimilarity(romanised: string, latin: string): number {
  const r = latinWords(romanised);
  const l = latinWords(latin);
  if (r.length < 2 || l.length < 2) return 0;
  const key = (ws: readonly string[]) => [...ws].sort().join('');
  if (key(r) === key(l)) return 0.95;
  // "Tai Man" is often written "Taiman" / "Tai-man": compare with the given name joined.
  if (r.join('') === l.join('') || key([r[0] ?? '', r.slice(1).join('')]) === key(l)) return 0.9;
  if (r.every((w) => l.includes(w))) return 0.85;
  const score = nameSimilarity(r.join(' '), l.join(' '));
  return score >= 0.85 ? score * 0.9 : 0;
}

/**
 * Cross-script and traditional/simplified pairs, matched on the server from
 * the forms the local model gave for each Chinese name.
 */
export function findCrossScriptDuplicates<T extends NamedItem>(
  chinese: readonly { item: T; forms: NameForms }[],
  latin: readonly T[],
): (NamePair<T> & { reason: string })[] {
  const pairs: (NamePair<T> & { reason: string })[] = [];
  for (let i = 0; i < chinese.length; i++) {
    const a = chinese[i];
    if (!a) continue;
    for (const b of chinese.slice(i + 1)) {
      if (
        a.forms.traditional &&
        a.forms.traditional === b.forms.traditional &&
        a.item.name !== b.item.name
      ) {
        pairs.push({
          a: a.item,
          b: b.item,
          score: 0.9,
          reason: 'Traditional / simplified characters',
        });
      }
    }
    for (const b of latin) {
      let best = 0;
      let via = '';
      for (const r of a.forms.romanised) {
        const score = romanisedSimilarity(r, b.name);
        if (score > best) {
          best = score;
          via = r;
        }
      }
      if (best > 0) pairs.push({ a: a.item, b, score: best, reason: `${a.item.name} → ${via}` });
    }
  }
  return pairs.sort((p, q) => q.score - p.score);
}
