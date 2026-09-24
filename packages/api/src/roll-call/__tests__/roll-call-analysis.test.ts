// packages/api/src/roll-call/__tests__/roll-call-analysis.test.ts
import { describe, expect, it } from 'vitest';

import { ageBand, analyse } from '../roll-call-analysis.js';
import type { InsightSession } from '../roll-call-insights.js';

const member = (
  id: string,
  sex: 'male' | 'female' | '',
  birthYear: number | null,
  active = true,
) => ({
  id,
  name: id,
  sex,
  birthYear,
  active,
});

function sessions(dates: string[], patterns: Record<string, string>): InsightSession[] {
  return dates.map((date, i) => ({
    date,
    guestCount: i,
    presentIds: new Set(Object.keys(patterns).filter((id) => patterns[id]?.[i] === '1')),
  }));
}

const dates = ['2026-01-04', '2026-01-11', '2026-01-18', '2026-02-01', '2026-02-08', '2026-02-15'];

describe('analyse', () => {
  const members = [
    member('amy', 'female', 2010),
    member('ben', 'male', 1980),
    member('cat', 'female', null),
    member('dan', '', 1950),
    member('eve', 'female', 1990, false),
  ];
  const result = analyse(
    members,
    sessions(dates, { amy: '111111', ben: '110000', cat: '000011', eve: '111111' }),
    2026,
  );

  it('builds a per-member table', () => {
    const byId = Object.fromEntries(result.members.map((m) => [m.id, m]));
    expect(result.members).toHaveLength(4); // inactive members are left out
    expect(byId['amy']).toMatchObject({
      age: 16,
      attended: 6,
      possible: 6,
      rate: 1,
      streak: 6,
      segment: 'regular',
    });
    expect(byId['ben']).toMatchObject({
      attended: 2,
      possible: 6,
      rate: 0.333,
      streak: -4,
      lastPresent: '2026-01-11',
      segment: 'occasional',
    });
    expect(byId['cat']).toMatchObject({ attended: 2, possible: 2, segment: 'new' });
    expect(byId['dan']).toMatchObject({ rate: null, segment: 'never', age: 76 });
  });

  it('summarises by month with the change from the month before', () => {
    expect(result.months).toEqual([
      {
        month: '2026-01',
        sessions: 3,
        avgPresent: 2.7,
        avgGuests: 1,
        avgRate: 0.417,
        change: null,
      },
      { month: '2026-02', sessions: 3, avgPresent: 2.7, avgGuests: 4, avgRate: 0.417, change: 0 },
    ]);
  });

  it('breaks attendance down by sex, age band and segment', () => {
    expect(result.bySex).toEqual([
      { key: 'female', members: 2, avgRate: 1 },
      { key: 'male', members: 1, avgRate: 0.333 },
      { key: 'unknown', members: 1, avgRate: null },
    ]);
    expect(result.byAge.map((r) => r.key)).toEqual(['12-17', '35-49', '65+', 'unknown']);
    expect(result.segments).toEqual({
      regular: 1,
      occasional: 1,
      rare: 0,
      lapsed: 0,
      new: 1,
      never: 1,
    });
  });

  it('puts ages into bands', () => {
    expect([ageBand(5), ageBand(17), ageBand(18), ageBand(64), ageBand(65), ageBand(null)]).toEqual(
      ['0-11', '12-17', '18-24', '50-64', '65+', 'unknown'],
    );
  });
});
