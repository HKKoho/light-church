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
