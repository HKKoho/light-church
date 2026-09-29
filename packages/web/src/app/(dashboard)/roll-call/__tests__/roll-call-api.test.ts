import { describe, expect, it } from 'vitest';
import {
  digitsFrom,
  nameKey,
  parseCsv,
  parsePeople,
  parseQuickRollCallCsv,
} from '../roll-call-api';

describe('Roll Call CSV helpers', () => {
  it('parses quoted cells, CRLF and a BOM', () => {
    expect(parseCsv('﻿a,"b, c"\r\n"say ""hi""",d\n\n')).toEqual([
      ['a', 'b, c'],
      ['say "hi"', 'd'],
    ]);
  });

  it('reads a Quick Roll Call export, taking the date from the first tick', () => {
    const csv = [
      '姓名,出席狀態,時間',
      '陳大文,出席,2026-09-20T02:05:00.000Z',
      'Mary Lee,缺席,',
      'Peter Chan,出席,2026-09-20T01:58:00.000Z',
    ].join('\n');
    expect(parseQuickRollCallCsv(csv)).toEqual({
      names: ['陳大文', 'Mary Lee', 'Peter Chan'],
      present: ['陳大文', 'Peter Chan'],
      date: '2026-09-20',
    });
  });

  it('accepts a plain list of names', () => {
    expect(parseQuickRollCallCsv('Amy\nBen\n')).toEqual({
      names: ['Amy', 'Ben'],
      present: [],
      date: null,
    });
  });

  it('matches names the way the server does', () => {
    expect(nameKey('Chan, Tai-Man')).toBe(nameKey('tai man CHAN'));
    expect(nameKey('陳 大文')).toBe('陳大文');
  });

  it('reads people from typed lines, in any order', () => {
    expect(parsePeople('陳大文, 男, 1985, 9123 4567, 詩班\nMary Lee, F, 34', 2026)).toEqual([
      { name: '陳大文', sex: 'male', birthYear: 1985, phoneLast4: '4567', department: '詩班' },
      { name: 'Mary Lee', sex: 'female', birthYear: 1992 },
    ]);
  });

  it('reads named columns, where a bare 4 digits is a phone ending', () => {
    const csv = ['姓名,電話末4碼,部門,年齡', '陳大文,1985,青年,30', 'Amy,,,'].join('\n');
    expect(parsePeople(csv, 2026)).toEqual([
      { name: '陳大文', phoneLast4: '1985', department: '青年', birthYear: 1996 },
      { name: 'Amy' },
    ]);
  });

  it('hears phone digits in Chinese, English or numerals', () => {
    expect(digitsFrom('九一二三')).toBe('9123');
    expect(digitsFrom('我嘅號碼係 5 6 七 八')).toBe('5678');
    expect(digitsFrom('nine one two three')).toBe('9123');
    expect(digitsFrom('91234567')).toBe('4567');
    expect(digitsFrom('一二')).toBeNull();
  });
});
