// packages/api/src/roll-call/roll-call-analysis.ts
//
// Pandas-style attendance analysis for one group, computed on the server with
// plain statistics: a per-member table, monthly summaries, breakdowns by sex
// and age band, and attendance segments. Nothing is sent to any model.
import type {
  RollCallAnalysis,
  RollCallBreakdownRow,
  RollCallMemberStats,
  RollCallMonth,
  RollCallSegment,
  RollCallSex,
} from '@clawix/shared';

import type { InsightSession } from './roll-call-insights.js';

export interface AnalysisMember {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly sex: RollCallSex;
  readonly birthYear: number | null;
}

const RECENT = 6;
/** Absent from this many recent roll calls in a row → lapsed. */
const LAPSED_STREAK = 8;
/** Fewer roll calls than this since first attending → new. */
const NEW_WITHIN = 4;

export const AGE_BANDS: readonly { key: string; max: number }[] = [
  { key: '0-11', max: 11 },
  { key: '12-17', max: 17 },
  { key: '18-24', max: 24 },
  { key: '25-34', max: 34 },
  { key: '35-49', max: 49 },
  { key: '50-64', max: 64 },
  { key: '65+', max: Infinity },
];

const round = (n: number, dp = 3) => Math.round(n * 10 ** dp) / 10 ** dp;
const mean = (xs: readonly number[]) =>
  xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

export function ageBand(age: number | null): string {
  if (age === null) return 'unknown';
  return AGE_BANDS.find((b) => age <= b.max)?.key ?? 'unknown';
}

function segment(possible: number, rate: number | null, streak: number): RollCallSegment {
  if (rate === null) return 'never';
  if (streak <= -LAPSED_STREAK) return 'lapsed';
  if (possible < NEW_WITHIN) return 'new';
  if (rate >= 0.75) return 'regular';
  if (rate >= 0.25) return 'occasional';
  return 'rare';
}

function memberStats(
  m: AnalysisMember,
  sessions: readonly InsightSession[],
  year: number,
): RollCallMemberStats {
  const age = m.birthYear === null ? null : year - m.birthYear;
  const first = sessions.findIndex((s) => s.presentIds.has(m.id));
  if (first < 0) {
    return {
      id: m.id,
      name: m.name,
      sex: m.sex,
      age,
      attended: 0,
      possible: 0,
      rate: null,
      change: null,
      streak: 0,
      lastPresent: null,
      segment: 'never',
    };
  }
  const marks = sessions.slice(first).map((s) => s.presentIds.has(m.id));
  const attended = marks.filter(Boolean).length;
  const rate = attended / marks.length;
  let streak = 0;
  for (let i = marks.length - 1; i >= 0; i--) {
    const here = marks[i] ? 1 : -1;
    if (streak !== 0 && Math.sign(streak) !== here) break;
    streak += here;
  }
  let change: number | null = null;
  if (marks.length > RECENT + 2) {
    const recent = marks.slice(-RECENT);
    const earlier = marks.slice(0, -RECENT);
    change = round(
      recent.filter(Boolean).length / recent.length -
        earlier.filter(Boolean).length / earlier.length,
    );
  }
  const lastIndex = marks.lastIndexOf(true);
  return {
    id: m.id,
    name: m.name,
    sex: m.sex,
    age,
    attended,
    possible: marks.length,
    rate: round(rate),
    change,
    streak,
    lastPresent: sessions[first + lastIndex]?.date ?? null,
    segment: segment(marks.length, rate, streak),
  };
}

/**
 * avgPresent is the real headcount (including people since removed from the
 * list); avgRate is the share of the current list who came.
 */
function months(
  sessions: readonly InsightSession[],
  activeIds: ReadonlySet<string>,
): RollCallMonth[] {
  const byMonth = new Map<string, InsightSession[]>();
  for (const s of sessions) {
    const key = s.date.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), s]);
  }
  const rows: RollCallMonth[] = [];
  for (const [month, list] of byMonth) {
    const avgPresent = mean(list.map((s) => s.presentIds.size)) ?? 0;
    const avgActive =
      mean(list.map((s) => [...s.presentIds].filter((id) => activeIds.has(id)).length)) ?? 0;
    const prev = rows.at(-1);
    rows.push({
      month,
      sessions: list.length,
      avgPresent: round(avgPresent, 1),
      avgGuests: round(mean(list.map((s) => s.guestCount)) ?? 0, 1),
      avgRate: activeIds.size > 0 ? round(avgActive / activeIds.size) : 0,
      change: prev ? round(avgPresent - prev.avgPresent, 1) || 0 : null,
    });
  }
  return rows;
}

function breakdown(
  stats: readonly RollCallMemberStats[],
  keyOf: (s: RollCallMemberStats) => string,
  order: readonly string[],
): RollCallBreakdownRow[] {
  return order
    .map((key) => {
      const group = stats.filter((s) => keyOf(s) === key);
      const rates = group.map((s) => s.rate).filter((r): r is number => r !== null);
      const avg = mean(rates);
      return { key, members: group.length, avgRate: avg === null ? null : round(avg) };
    })
    .filter((row) => row.members > 0);
}

/** Sessions must be sorted by date, oldest first. */
export function analyse(
  members: readonly AnalysisMember[],
  sessions: readonly InsightSession[],
  year = new Date().getFullYear(),
): RollCallAnalysis {
  const active = members.filter((m) => m.active);
  const stats = active.map((m) => memberStats(m, sessions, year));
  const segments: Record<RollCallSegment, number> = {
    regular: 0,
    occasional: 0,
    rare: 0,
    lapsed: 0,
    new: 0,
    never: 0,
  };
  for (const s of stats) segments[s.segment]++;
  return {
    sessions: sessions.length,
    members: stats,
    months: months(sessions, new Set(active.map((m) => m.id))),
    bySex: breakdown(stats, (s) => s.sex || 'unknown', ['female', 'male', 'unknown']),
    byAge: breakdown(stats, (s) => ageBand(s.age), [...AGE_BANDS.map((b) => b.key), 'unknown']),
    segments,
  };
}
