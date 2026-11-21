// packages/api/src/theology-library/__tests__/text-processing.test.ts
import { describe, expect, it } from 'vitest';

import {
  MAX_TOKENS,
  OVERLAP_TOKENS,
  TARGET_TOKENS,
  chunkDocument,
  estimateTokens,
} from '../chunking.js';
import { chapterKeys, extractScriptureRefs } from '../scripture-refs.js';

describe('extractScriptureRefs', () => {
  it.each([
    ['見約3:16。', ['JHN 3', 'JHN 3:16']],
    ['羅馬書3:23', ['ROM 3', 'ROM 3:23']],
    ['以賽亞書53:5-6 說', ['ISA 53', 'ISA 53:5-6']],
    ['參林前13:4–7及約壹1:9', ['1CO 13', '1CO 13:4-7', '1JN 1', '1JN 1:9']],
    ['羅馬書8章', ['ROM 8']],
    ['約３：１６', ['JHN 3', 'JHN 3:16']],
    ['John 3:16 and 1 John 4:8', ['1JN 4', '1JN 4:8', 'JHN 3', 'JHN 3:16']],
    ['see 1 Cor. 15:3, II Tim 3:16, Ps 23', ['1CO 15', '1CO 15:3', '2TI 3', '2TI 3:16', 'PSA 23']],
    ['Romans 8', ['ROM 8']],
    ['Song of Songs 2:4', ['SNG 2', 'SNG 2:4']],
  ])('reads %s', (text, expected) => {
    expect(extractScriptureRefs(text)).toEqual([...expected].sort());
  });

  it.each([
    ['lower-case prose', 'we mark 4 points; job 5 is done'],
    ['a short name inside a word, without a verse', '亞伯拉罕有3個兒子'],
    ['empty text', ''],
  ])('ignores %s', (_label, text) => {
    expect(extractScriptureRefs(text)).toEqual([]);
  });

  it('does not read the 書 in 羅馬書 as Joshua', () => {
    expect(extractScriptureRefs('羅馬書3:16')).not.toContain('JOS 3:16');
  });

  it('drops a range end that is not after the start', () => {
    expect(extractScriptureRefs('John 3:16-2')).toEqual(['JHN 3', 'JHN 3:16']);
  });

  it('keeps only chapter keys for matching', () => {
    expect(chapterKeys(['JHN 3', 'JHN 3:16', 'ROM 8'])).toEqual(['JHN 3', 'ROM 8']);
  });
});

describe('estimateTokens', () => {
  it('counts CJK characters one each and other text by four', () => {
    expect(estimateTokens('因信稱義')).toBe(4);
    expect(estimateTokens('abcdefgh')).toBe(2);
  });
});

describe('chunkDocument', () => {
  it('tags passages with their page and heading, skipping extraction notes', () => {
    const md = [
      '# Grace',
      '## Page 3',
      'First paragraph.',
      '',
      '[UNEXTRACTED: no text layer and OCR could not recover this page]',
      '',
      '*(recovered via OCR)*',
    ].join('\n');
    const [chunk, ...rest] = chunkDocument(md);
    expect(rest).toEqual([]);
    expect(chunk).toMatchObject({ index: 0, page: 3, heading: 'Grace', text: 'First paragraph.' });
  });

  it('returns nothing for an empty document', () => {
    expect(chunkDocument('\n\n## Page 1\n\n')).toEqual([]);
  });

  it('splits long text into bounded, overlapping passages', () => {
    const paragraph = (n: number) => `Paragraph ${n} ${'word '.repeat(60)}.`;
    const md = Array.from({ length: 40 }, (_, i) => paragraph(i)).join('\n\n');
    const chunks = chunkDocument(md);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks)
      expect(c.tokenCount).toBeLessThanOrEqual(TARGET_TOKENS + OVERLAP_TOKENS);
    // The last paragraph of one passage opens the next.
    const lastOfFirst = chunks[0]!.text.split('\n\n').at(-1)!;
    expect(chunks[1]!.text.startsWith(lastOfFirst)).toBe(true);
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
  });

  it('breaks an over-long paragraph at sentence ends', () => {
    const sentence = '神愛世人，甚至將他的獨生子賜給他們。';
    const chunks = chunkDocument(sentence.repeat(120));
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.tokenCount).toBeLessThanOrEqual(MAX_TOKENS + OVERLAP_TOKENS);
      expect(c.text.endsWith('。')).toBe(true);
    }
  });

  it('hard-cuts text with no sentence breaks', () => {
    const chunks = chunkDocument('字'.repeat(3000));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.text).join('')).toContain('字'.repeat(500));
  });
});
