import { describe, expect, it } from 'vitest';
import { nameKey, parseCsv, parseQuickRollCallCsv } from '../roll-call-api';

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
});
