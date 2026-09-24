// packages/api/src/roll-call/__tests__/roll-call-names.test.ts
import { describe, expect, it } from 'vitest';

import {
  bestMatch,
  findCrossScriptDuplicates,
  findDuplicates,
  nameSimilarity,
  normalizeName,
  romanisedSimilarity,
} from '../roll-call-names.js';

describe('name matching', () => {
  it('ignores case, spacing, punctuation, full-width letters and English word order', () => {
    expect(normalizeName('  Chan, Tai-Man ')).toBe(normalizeName('tai man chan'));
    expect(normalizeName('ＰＥＴＥＲ')).toBe('peter');
    expect(nameSimilarity('陳 大文', '陳大文')).toBe(1);
  });

  it('scores typos in English names and one-character differences in Chinese names', () => {
    expect(nameSimilarity('Catherine Wong', 'Catherin Wong')).toBeGreaterThan(0.9);
    expect(nameSimilarity('陳大文', '陳大民')).toBe(0.7);
    expect(nameSimilarity('陳文', '李文')).toBe(0);
    expect(nameSimilarity('Amy', 'Ann')).toBe(0);
  });

  it('leaves cross-script pairs to the local model', () => {
    expect(nameSimilarity('陳大文', 'Chan Tai Man')).toBe(0);
  });

  it('finds duplicates and the best member for a written name', () => {
    const members = [
      { id: '1', name: 'Peter Chan' },
      { id: '2', name: 'Chan Peter' },
      { id: '3', name: 'Mary Lee' },
    ];
    expect(findDuplicates(members).map((p) => [p.a.id, p.b.id, p.score])).toEqual([['1', '2', 1]]);
    expect(bestMatch('mary  lee', members)?.item.id).toBe('3');
    expect(bestMatch('John', members)).toBeNull();
  });

  it('matches romanised Chinese names but never on a shared surname alone', () => {
    expect(romanisedSimilarity('Chan Tai Man', 'Tai-Man Chan')).toBe(0.95);
    expect(romanisedSimilarity('Chan Tai Man', 'CHAN Taiman')).toBe(0.9);
    expect(romanisedSimilarity('Chan Tai Man', 'Peter Chan Tai Man')).toBe(0.85);
    expect(romanisedSimilarity('Chan Tai Man', 'Peter Chan')).toBe(0);
    expect(romanisedSimilarity('Lee Siu Ming', 'Peter Wong')).toBe(0);
  });

  it('pairs Chinese names with their romanisation and their simplified form', () => {
    const forms = { traditional: '陳大文', romanised: ['Chan Tai Man', 'Chen Da Wen'] };
    const pairs = findCrossScriptDuplicates(
      [
        { item: { id: 'a', name: '陳大文' }, forms },
        { item: { id: 'b', name: '陈大文' }, forms },
        {
          item: { id: 'c', name: '李小明' },
          forms: { traditional: '李小明', romanised: ['Lee Siu Ming'] },
        },
      ],
      [
        { id: 'd', name: 'Chan Tai Man' },
        { id: 'e', name: 'Peter Wong' },
      ],
    );
    expect(pairs.map((p) => [p.a.id, p.b.id])).toEqual([
      ['a', 'd'],
      ['b', 'd'],
      ['a', 'b'],
    ]);
  });
});
