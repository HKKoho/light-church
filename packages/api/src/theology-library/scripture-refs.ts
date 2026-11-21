// packages/api/src/theology-library/scripture-refs.ts
//
// Finds Scripture references in English or Chinese text and normalises them to
// USFM keys. Each reference yields a chapter key ("JHN 3") and, when a verse is
// given, a verse key ("JHN 3:16-18"). Search boosts passages that share a
// chapter key with the question, so "John 3" finds a chunk citing 約3:16.
import { BIBLE_BOOKS } from './bible-books.js';

const ROMAN = ['', 'I', 'II', 'III'] as const;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byLengthDesc = (a: string, b: string) => b.length - a.length;

/** Name variant → book code, for each matching mode. */
const enNames = new Map<string, string>();
const zhFull = new Map<string, string>();
const zhShort = new Map<string, string>();

for (const book of BIBLE_BOOKS) {
  for (const name of book.en) {
    if (book.n) {
      const roman = ROMAN[book.n] ?? '';
      for (const prefix of [`${book.n} `, `${book.n}`, `${roman} `]) {
        enNames.set(`${prefix}${name}`.toLowerCase(), book.code);
      }
    } else {
      enNames.set(name.toLowerCase(), book.code);
    }
  }
  for (const name of book.zh) zhFull.set(name, book.code);
  for (const name of book.zhShort) zhShort.set(name, book.code);
}

const alt = (names: Iterable<string>) => [...names].sort(byLengthDesc).map(escape).join('|');

const SEP = String.raw`\s*[:：]\s*`;
const RANGE = String.raw`(?:\s*[-–~～]\s*(\d{1,3}))?`;

// English: capitalised book name (optional "."), chapter, optional :verse[-verse].
const EN_RE = new RegExp(
  String.raw`(?<![A-Za-z])(${alt(enNames.keys())})\.?\s*(\d{1,3})(?:${SEP}(\d{1,3})${RANGE})?(?![\d:])`,
  'gi',
);
// Chinese full name: chapter, then :verse[-verse] or 章 or nothing.
const ZH_FULL_RE = new RegExp(
  String.raw`(${alt(zhFull.keys())})\s*(\d{1,3})(?:${SEP}(\d{1,3})${RANGE})?`,
  'g',
);
// Chinese short form: must have chapter:verse. Matched after full names are
// blanked out, so "羅馬書3:16" is not also read as 書 (Joshua) 3:16.
const ZH_SHORT_RE = new RegExp(
  String.raw`(${alt(zhShort.keys())})\s*(\d{1,3})${SEP}(\d{1,3})${RANGE}`,
  'g',
);

/** Full-width digits and colon → ASCII, so "約３：１６" matches. */
function normalise(text: string): string {
  return text.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

function keysFor(code: string, chapter: string, verse?: string, end?: string): string[] {
  const keys = [`${code} ${Number(chapter)}`];
  if (verse) {
    const range = end && Number(end) > Number(verse) ? `-${Number(end)}` : '';
    keys.push(`${code} ${Number(chapter)}:${Number(verse)}${range}`);
  }
  return keys;
}

/** Sorted, de-duplicated chapter and verse keys found in `text`. */
export function extractScriptureRefs(text: string): string[] {
  const src = normalise(text);
  const found = new Set<string>();

  for (const m of src.matchAll(EN_RE)) {
    const [, name, chapter, verse, end] = m;
    // Book names must start with a capital (or digit) — "mark 4" in prose is not Mark 4.
    if (!name || !chapter || !/^[A-Z0-9]/.test(name)) continue;
    const code = enNames.get(name.toLowerCase());
    if (code) keysFor(code, chapter, verse, end).forEach((k) => found.add(k));
  }
  const addZh = (names: Map<string, string>, m: RegExpMatchArray) => {
    const [, name, chapter, verse, end] = m;
    const code = name ? names.get(name) : undefined;
    if (code && chapter) keysFor(code, chapter, verse, end).forEach((k) => found.add(k));
  };
  // Full names first, then blank each match out so short forms can't re-read it.
  let masked = src;
  for (const m of src.matchAll(ZH_FULL_RE)) {
    addZh(zhFull, m);
    const at = m.index ?? 0;
    masked = masked.slice(0, at) + ' '.repeat(m[0].length) + masked.slice(at + m[0].length);
  }
  for (const m of masked.matchAll(ZH_SHORT_RE)) addZh(zhShort, m);
  return [...found].sort();
}

/** Only the chapter-level keys ("ROM 8"), used to match a question to passages. */
export function chapterKeys(refs: readonly string[]): string[] {
  return refs.filter((r) => !r.includes(':'));
}
