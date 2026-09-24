// packages/api/src/roll-call/roll-call-insights.ts
//
// Pastoral-care alerts and attendance forecasts, computed with plain
// statistics on the server — no names are sent to any model.
import type {
  RollCallAlert,
  RollCallForecast,
  RollCallInsights,
  RollCallTrendPoint,
} from '@clawix/shared';

export interface InsightSession {
  readonly date: string; // YYYY-MM-DD
  readonly guestCount: number;
  readonly presentIds: ReadonlySet<string>;
}

export interface InsightMember {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
}

/** Missed this many sessions in a row → "missing". */
export const MISSING_STREAK = 3;
/** …after attending at least this share of earlier sessions. */
const REGULAR_RATE = 0.5;
/** Earlier sessions needed before a pattern counts. */
const MIN_HISTORY = 4;
/** Recent window compared with the earlier record for "declining". */
const RECENT_WINDOW = 6;
const DECLINE_DROP = 0.4;
const TREND_POINTS = 12;
const FORECAST_WINDOW = 8;
const EWMA_ALPHA = 0.4;

const rate = (xs: readonly boolean[]) =>
  xs.length === 0 ? 0 : xs.filter(Boolean).length / xs.length;

/** A member's record, from the first session they attended onward. */
function history(member: InsightMember, sessions: readonly InsightSession[]) {
  const first = sessions.findIndex((s) => s.presentIds.has(member.id));
  if (first < 0) return null;
  return sessions.slice(first).map((s) => ({ date: s.date, present: s.presentIds.has(member.id) }));
}

function trailingAbsences(record: readonly { present: boolean }[]): number {
  let n = 0;
  for (let i = record.length - 1; i >= 0 && !record[i]?.present; i--) n++;
  return n;
}

function alertFor(
  member: InsightMember,
  sessions: readonly InsightSession[],
): RollCallAlert | null {
  const record = history(member, sessions);
  if (!record) return null;
  const present = record.map((r) => r.present);
  const lastPresent = [...record].reverse().find((r) => r.present)?.date ?? null;
  const base = { memberId: member.id, name: member.name, lastPresent };

  const missed = trailingAbsences(record);
  if (missed >= MISSING_STREAK) {
    const before = present.slice(0, present.length - missed);
    const previousRate = rate(before);
    if (before.length >= MIN_HISTORY && previousRate >= REGULAR_RATE) {
      return { ...base, kind: 'missing', streak: missed, previousRate, recentRate: 0 };
    }
    return null;
  }

  // Came back after a long gap: worth a welcome.
  if (present.at(-1)) {
    const earlier = record.slice(0, -1);
    const gap = trailingAbsences(earlier);
    if (gap >= MISSING_STREAK) {
      const before = present.slice(0, earlier.length - gap);
      return {
        ...base,
        kind: 'returned',
        streak: gap,
        previousRate: rate(before),
        recentRate: rate(present.slice(-RECENT_WINDOW)),
      };
    }
  }

  if (present.length >= MIN_HISTORY + RECENT_WINDOW) {
    const recentRate = rate(present.slice(-RECENT_WINDOW));
    const previousRate = rate(present.slice(0, -RECENT_WINDOW));
    if (previousRate - recentRate >= DECLINE_DROP) {
      return { ...base, kind: 'declining', streak: missed, previousRate, recentRate };
    }
  }
  return null;
}

const ORDER: Record<RollCallAlert['kind'], number> = { missing: 0, declining: 1, returned: 2 };

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

/** Least-squares slope per session. */
function slope(ys: readonly number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = mean(ys);
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  });
  return num / den;
}

function ewma(ys: readonly number[]): number {
  return ys.reduce((acc, y, i) => (i === 0 ? y : EWMA_ALPHA * y + (1 - EWMA_ALPHA) * acc), 0);
}

export function forecast(trend: readonly RollCallTrendPoint[]): RollCallForecast | null {
  const recent = trend.slice(-FORECAST_WINDOW);
  if (recent.length < 3) return null;
  const present = recent.map((p) => p.present);
  const expected = ewma(present);
  const spread = Math.sqrt(mean(present.map((y) => (y - mean(present)) ** 2)));
  const perSession = slope(present);
  // A change of 3% of the average per session (at least half a person) counts.
  const threshold = Math.max(0.5, 0.03 * mean(present));
  return {
    expected: Math.round(expected),
    low: Math.max(0, Math.floor(expected - spread)),
    high: Math.ceil(expected + spread),
    expectedGuests: Math.round(ewma(recent.map((p) => p.guests))),
    direction: perSession > threshold ? 'rising' : perSession < -threshold ? 'falling' : 'steady',
    basedOn: recent.length,
  };
}

/** Sessions must be sorted by date, oldest first. */
export function computeInsights(
  members: readonly InsightMember[],
  sessions: readonly InsightSession[],
): RollCallInsights {
  const active = members.filter((m) => m.active);
  const alerts = active
    .map((m) => alertFor(m, sessions))
    .filter((a): a is RollCallAlert => a !== null)
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || b.streak - a.streak);
  const neverAttended =
    sessions.length === 0
      ? []
      : active
          .filter((m) => !sessions.some((s) => s.presentIds.has(m.id)))
          .map((m) => ({ id: m.id, name: m.name }));
  const points = sessions.map((s) => ({
    date: s.date,
    present: s.presentIds.size,
    guests: s.guestCount,
    members: active.length,
  }));
  return { alerts, neverAttended, trend: points.slice(-TREND_POINTS), forecast: forecast(points) };
}
