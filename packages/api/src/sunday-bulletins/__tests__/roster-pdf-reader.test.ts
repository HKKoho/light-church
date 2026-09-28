// packages/api/src/sunday-bulletins/__tests__/roster-pdf-reader.test.ts
import { describe, expect, it } from 'vitest';
import { BadGatewayException } from '@nestjs/common';

import { gridFromPage, gridToMarkdown } from '../roster-pdf-layout.js';
import { applyRosterMapping, calibrateMapping, parseRosterMapping } from '../roster-pdf-reader.js';

// Text items as pdfjs places them: a letter-spaced title, a header row, and
// two services whose second line of names sits under the first.
const item = (text: string, x: number, y: number, width = 30, height = 7) => ({
  text,
  x,
  y,
  width,
  height,
});
const page = [
  ...['茶', '果', '嶺'].map((c, i) => item(c, 300 + i * 40, 560, 16, 16)),
  item('二 零 二 六 年 十 至 十 二 月 主 日 崇 拜 司 職 表', 290, 544, 400, 16),
  item('日', 97, 524, 7),
  item('期', 108, 524, 7),
  item('主 席', 150, 524, 18),
  item('領詩/司琴', 196, 524, 31),
  item('主餐襄禮', 250, 524, 29),
  item('講 員', 307, 524, 18),
  item('影 音', 465, 524, 18),
  item('10月4日', 95, 514, 24),
  item('郭永健弟兄', 141, 514, 36),
  item('劉家安弟兄', 194, 514, 36),
  item('林遠宏執事*', 244, 514, 39),
  item('葉秀嫻傳道', 299, 514, 36),
  item('林國良弟兄(影)', 450, 514, 48),
  item('主餐', 100, 506, 14),
  item('馮恩誠執事', 194, 506, 36),
  item('張黎麗明執事', 243, 506, 43),
  item('林睿僖弟兄(音)', 450, 506, 48),
  item('10月11日', 95, 480, 28),
  item('盧志宏弟兄', 141, 480, 36),
  item('馬學強弟兄', 194, 480, 36),
  item('陳潤生傳道', 299, 480, 36),
  item('---', 465, 480, 10),
  item('10月11日', 95, 450, 28),
  item('浸禮(下午)', 95, 442, 30),
  item('郭永健弟兄', 141, 450, 36),
  item('*預備主餐', 250, 400, 30, 4),
];

describe('gridFromPage', () => {
  it('rebuilds the roster grid, keeping each name in its own column', () => {
    const grid = gridFromPage(page)!;
    expect(grid.columns).toEqual(['日期', '主席', '領詩/司琴', '主餐襄禮', '講員', '影音']);
    expect(grid.rows[0]).toEqual([
      ['10月4日', '主餐'],
      ['郭永健弟兄'],
      ['劉家安弟兄', '馮恩誠執事'],
      ['林遠宏執事*', '張黎麗明執事'],
      ['葉秀嫻傳道'],
      ['林國良弟兄(影)', '林睿僖弟兄(音)'],
    ]);
    expect(grid.rows).toHaveLength(3);
    expect(grid.title).toContain('二 零 二 六 年');
    expect(grid.notes).toEqual(['*預備主餐']);
    expect(gridToMarkdown(grid)).toContain(
      '| 10月4日 主餐 | 郭永健弟兄 | 劉家安弟兄、馮恩誠執事 |',
    );
  });

  it('returns null for a page without a grid', () => {
    expect(gridFromPage([item('hello', 10, 10), item('world', 60, 10)])).toBeNull();
  });
});

describe('applyRosterMapping', () => {
  const S = '主日崇拜事奉芳名表';
  const mapping = parseRosterMapping(
    JSON.stringify({
      year: 2026,
      columns: [
        { column: '主席', targets: [{ section: S, role: '主席', take: 'all' }] },
        {
          column: '領詩/司琴',
          targets: [
            { section: S, role: '領詩', take: 'first' },
            { section: S, role: '司琴', take: 'second' },
          ],
        },
        {
          column: '主餐襄禮',
          targets: [
            { section: S, role: '襄禮', take: 'all' },
            { section: S, role: '預備主餐', take: 'starred' },
          ],
        },
        {
          column: '講員',
          targets: [
            { section: S, role: '信息', take: 'all' },
            { section: S, role: '主持主餐', take: 'all', onlyIf: '主餐' },
          ],
        },
        { column: '影 音', targets: [{ section: '', role: '影音', take: 'all' }] },
      ],
    }),
  );

  it('copies names from the grid into the bulletin rows, one date at a time', () => {
    const { entries, notes } = applyRosterMapping(gridFromPage(page)!, mapping);
    const oct4 = Object.fromEntries(
      entries.filter((e) => e.date === '2026-10-04').map((e) => [e.role, e.name]),
    );
    expect(oct4).toEqual({
      主席: '郭永健弟兄',
      領詩: '劉家安弟兄',
      司琴: '馮恩誠執事',
      襄禮: '林遠宏執事\n張黎麗明執事',
      預備主餐: '林遠宏執事',
      信息: '葉秀嫻傳道',
      主持主餐: '葉秀嫻傳道',
      影音: '林國良弟兄\n林睿僖弟兄',
    });
    expect(entries.every((e) => e.section === S)).toBe(true);

    const oct11 = entries.filter((e) => e.date === '2026-10-11').map((e) => e.role);
    expect(oct11).toEqual(['主席', '領詩', '信息']); // no 主餐 rows, dashes skipped
    expect(notes).toEqual(['10月4日：主餐', '10月11日 浸禮(下午)：同日另一場聚會，未套用到週刊']);
  });

  it("corrects a pick that does not reproduce the bulletin's own names", () => {
    const wrong = parseRosterMapping(
      JSON.stringify({
        year: 2026,
        columns: [{ column: '主餐襄禮', targets: [{ section: S, role: '襄禮', take: 'rest' }] }],
      }),
    );
    const examples = [{ section: S, role: '襄禮', example: '林遠宏執事\n張黎麗明執事' }];
    const grid = gridFromPage(page)!;

    const fixed = calibrateMapping(grid, wrong, examples, '2026-10-04');
    expect(fixed.columns[0]?.targets[0]?.take).toBe('all');
    // No example date in the roster: left as the AI said.
    expect(calibrateMapping(grid, wrong, examples, '2026-12-27')).toBe(wrong);
  });

  it('moves a row to the column that names its people, ignoring titles and extra names', () => {
    const wrong = parseRosterMapping(
      JSON.stringify({
        year: 2026,
        columns: [
          {
            column: '主餐襄禮',
            targets: [{ section: S, role: '主持主餐', take: 'starred', onlyIf: '主餐' }],
          },
          { column: '講員', targets: [{ section: S, role: '信息', take: 'all' }] },
          { column: '影音', targets: [{ section: S, role: '影音', take: 'all' }] },
        ],
      }),
    );
    const examples = [
      { section: S, role: '主持主餐', example: '葉秀嫻牧師' },
      { section: S, role: '影音', example: '林睿僖弟兄' }, // bulletin missed one name
    ];

    const fixed = calibrateMapping(gridFromPage(page)!, wrong, examples, '2026-10-04');
    expect(
      fixed.columns.map((c) => [c.column, c.targets.map((t) => `${t.role}:${t.take}`)]),
    ).toEqual([
      ['主餐襄禮', []],
      ['講員', ['主持主餐:all', '信息:all']],
      ['影音', ['影音:all']],
    ]);
    expect(fixed.columns[1]?.targets[0]?.onlyIf).toBe('主餐');
  });

  it('rejects a reply that is not a mapping', () => {
    expect(() => parseRosterMapping('no idea')).toThrow(BadGatewayException);
    expect(() => parseRosterMapping('{"columns": []}')).toThrow(BadGatewayException);
  });
});
