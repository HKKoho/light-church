// packages/api/src/roll-call/__tests__/roll-call-insights.test.ts
import { describe, expect, it } from 'vitest';

import { computeInsights, forecast, type InsightSession } from '../roll-call-insights.js';

const members = [
  { id: 'amy', name: 'Amy', active: true },
  { id: 'ben', name: 'Ben', active: true },
  { id: 'cat', name: 'Cat', active: true },
  { id: 'dan', name: 'Dan', active: true },
  { id: 'eve', name: 'Eve', active: false },
];

/** One session per pattern column: "1" present, "0" absent. */
function sessions(patterns: Record<string, string>): InsightSession[] {
  const length = Math.max(...Object.values(patterns).map((p) => p.length));
  return Array.from({ length }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    guestCount: 2,
    presentIds: new Set(Object.keys(patterns).filter((id) => patterns[id]?.[i] === '1')),
  }));
}

describe('computeInsights', () => {
  it('flags a regular attender who has missed three in a row', () => {
    const { alerts } = computeInsights(members, sessions({ amy: '11111000', ben: '11111111' }));
    expect(alerts).toEqual([
      expect.objectContaining({
        memberId: 'amy',
        kind: 'missing',
        streak: 3,
        previousRate: 1,
        lastPresent: '2026-01-05',
      }),
    ]);
  });

  it('does not flag an occasional attender', () => {
    const { alerts } = computeInsights(members, sessions({ amy: '10001000', ben: '11111111' }));
    expect(alerts).toEqual([]);
  });

  it('notices someone coming back after a gap, and a declining pattern', () => {
    const { alerts } = computeInsights(
      members,
      sessions({ amy: '1111111110001', ben: '1111111110010', cat: '1111111111111' }),
    );
    expect(alerts.map((a) => [a.memberId, a.kind])).toEqual([
      ['ben', 'declining'],
      ['amy', 'returned'],
    ]);
  });

  it('lists active members who never attended, and ignores inactive ones', () => {
    const result = computeInsights(members, sessions({ amy: '111', eve: '000' }));
    expect(result.neverAttended.map((m) => m.id)).toEqual(
      ['ben', 'cat', 'dan', 'eve'].filter((id) => id !== 'eve'),
    );
    expect(result.trend).toHaveLength(3);
    expect(result.trend[0]).toEqual({ date: '2026-01-01', present: 1, guests: 2, members: 4 });
  });

  it('has nothing to report before the first roll call', () => {
    expect(computeInsights(members, [])).toEqual({
      alerts: [],
      neverAttended: [],
      trend: [],
      forecast: null,
    });
  });
});

describe('forecast', () => {
  const points = (ys: number[]) =>
    ys.map((present, i) => ({ date: `d${i}`, present, guests: 1, members: 50 }));

  it('needs at least three roll calls', () => {
    expect(forecast(points([10, 12]))).toBeNull();
  });

  it('expects about the recent level with a range', () => {
    const f = forecast(points([40, 42, 41, 40, 42, 41]));
    expect(f).toMatchObject({ direction: 'steady', expectedGuests: 1, basedOn: 6 });
    expect(f?.expected).toBeGreaterThanOrEqual(40);
    expect(f?.expected).toBeLessThanOrEqual(42);
    expect(f?.low).toBeLessThanOrEqual(f?.expected ?? 0);
    expect(f?.high).toBeGreaterThanOrEqual(f?.expected ?? 0);
  });

  it('reads the direction of travel', () => {
    expect(forecast(points([20, 24, 28, 32, 36]))?.direction).toBe('rising');
    expect(forecast(points([36, 32, 28, 24, 20]))?.direction).toBe('falling');
  });
});
