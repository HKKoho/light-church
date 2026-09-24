'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Loader2 } from 'lucide-react';
import type { RollCallAnalysis, RollCallMemberStats, RollCallSegment } from '@clawix/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { downloadCsv, groupApi } from '../roll-call-api';
import { useRollCallT } from '../messages';

type SortKey =
  | 'name'
  | 'sex'
  | 'age'
  | 'attended'
  | 'rate'
  | 'change'
  | 'streak'
  | 'lastPresent'
  | 'segment';

const SEGMENT_TONE: Record<RollCallSegment, string> = {
  regular: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  occasional: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  rare: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  lapsed: 'bg-red-500/15 text-red-700 dark:text-red-300',
  new: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  never: 'bg-muted text-muted-foreground',
};
const SEGMENT_ORDER: RollCallSegment[] = [
  'regular',
  'occasional',
  'rare',
  'lapsed',
  'new',
  'never',
];

const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`);
const signed = (n: number | null, unit = '') =>
  n === null ? '—' : `${n > 0 ? '+' : ''}${n}${unit}`;

function compare(a: RollCallMemberStats, b: RollCallMemberStats, key: SortKey): number {
  const va = a[key];
  const vb = b[key];
  if (va === vb) return 0;
  if (va === null || va === '') return 1; // blanks last
  if (vb === null || vb === '') return -1;
  if (key === 'segment')
    return (
      SEGMENT_ORDER.indexOf(va as RollCallSegment) - SEGMENT_ORDER.indexOf(vb as RollCallSegment)
    );
  return typeof va === 'number' && typeof vb === 'number'
    ? va - vb
    : String(va).localeCompare(String(vb));
}

function Bar({ value }: { value: number | null }) {
  return (
    <div className="h-2 w-full rounded bg-muted">
      <div
        className="h-2 rounded bg-sky-500"
        style={{ width: `${Math.round((value ?? 0) * 100)}%` }}
      />
    </div>
  );
}

export function AnalysisPanel({ groupId, groupName }: { groupId: string; groupName: string }) {
  const t = useRollCallT();
  const [data, setData] = useState<RollCallAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'rate', desc: true });

  useEffect(() => {
    authFetch<{ data: RollCallAnalysis }>(`${groupApi(groupId)}/analysis`)
      .then((res) => setData(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t.failed));
  }, [groupId, t.failed]);

  const rows = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.members].sort((a, b) => compare(a, b, sort.key));
    return sort.desc ? sorted.reverse() : sorted;
  }, [data, sort]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  if (data.sessions === 0) return <p className="text-sm text-muted-foreground">{t.noData}</p>;

  const sexLabel = (k: string) => (k === 'male' || k === 'female' ? t.sexes[k] : t.unknown);
  const columns: [SortKey, string][] = [
    ['name', t.colName],
    ['sex', t.colSex],
    ['age', t.colAge],
    ['attended', t.colAttended],
    ['rate', t.colRate],
    ['change', t.colChange],
    ['streak', t.colStreak],
    ['lastPresent', t.colLast],
    ['segment', t.colSegment],
  ];

  const exportTable = () =>
    downloadCsv(`${groupName}_analysis.csv`, [
      columns.map(([, label]) => label),
      ...rows.map((m) => [
        m.name,
        m.sex ? t.sexes[m.sex] : '',
        m.age ?? '',
        `${m.attended}/${m.possible}`,
        m.rate === null ? '' : Math.round(m.rate * 100),
        m.change === null ? '' : Math.round(m.change * 100),
        m.streak,
        m.lastPresent ?? '',
        t.segments[m.segment],
      ]),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-muted-foreground">{t.analysisIntro}</p>

      <div className="flex flex-wrap gap-2">
        {SEGMENT_ORDER.map((s) => (
          <span key={s} className={`rounded-md px-3 py-1.5 text-sm ${SEGMENT_TONE[s]}`}>
            {t.segments[s]} <span className="font-semibold tabular-nums">{data.segments[s]}</span>
          </span>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center">
          <Button size="sm" variant="outline" className="ml-auto" onClick={exportTable}>
            <Download className="mr-1.5 size-3.5" />
            {t.exportAnalysis}
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                {columns.map(([key, label]) => (
                  <th key={key} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                    <button
                      type="button"
                      className="flex items-center gap-1"
                      onClick={() =>
                        setSort({ key, desc: sort.key === key ? !sort.desc : key !== 'name' })
                      }
                    >
                      {label}
                      {sort.key === key &&
                        (sort.desc ? (
                          <ArrowDown className="size-3" />
                        ) : (
                          <ArrowUp className="size-3" />
                        ))}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium">{m.name}</td>
                  <td className="px-3 py-1.5">{m.sex ? t.sexShort[m.sex] : '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums">{m.age ?? '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums">{`${m.attended}/${m.possible}`}</td>
                  <td className="min-w-[7rem] px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-9 tabular-nums">{pct(m.rate)}</span>
                      <Bar value={m.rate} />
                    </div>
                  </td>
                  <td
                    className={`px-3 py-1.5 tabular-nums ${
                      (m.change ?? 0) < -0.2
                        ? 'text-red-600'
                        : (m.change ?? 0) > 0.2
                          ? 'text-emerald-600'
                          : ''
                    }`}
                  >
                    {m.change === null ? '—' : signed(Math.round(m.change * 100), '%')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-xs">
                    {m.streak > 0
                      ? t.streakPresent(m.streak)
                      : m.streak < 0
                        ? t.streakAbsent(-m.streak)
                        : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">
                    {m.lastPresent ?? '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge variant="secondary" className={SEGMENT_TONE[m.segment]}>
                      {t.segments[m.segment]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t.months}</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                {[
                  t.colMonth,
                  t.colSessions,
                  t.colAvgPresent,
                  t.colAvgGuests,
                  t.colAvgRate,
                  t.colChange,
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {data.months.map((m) => (
                <tr key={m.month}>
                  <td className="px-3 py-1.5 font-medium">{m.month}</td>
                  <td className="px-3 py-1.5">{m.sessions}</td>
                  <td className="px-3 py-1.5">{m.avgPresent}</td>
                  <td className="px-3 py-1.5">{m.avgGuests}</td>
                  <td className="px-3 py-1.5">{pct(m.avgRate)}</td>
                  <td
                    className={`px-3 py-1.5 ${(m.change ?? 0) < 0 ? 'text-red-600' : (m.change ?? 0) > 0 ? 'text-emerald-600' : ''}`}
                  >
                    {signed(m.change)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {(
          [
            [t.bySex, data.bySex, sexLabel],
            [t.byAge, data.byAge, (k: string) => (k === 'unknown' ? t.unknown : k)],
          ] as const
        ).map(([title, breakdown, label]) => (
          <section key={title} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t.colGroup}</th>
                    <th className="px-3 py-2 text-left font-medium">{t.colMembers}</th>
                    <th className="px-3 py-2 text-left font-medium">{t.colAvgRate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {breakdown.map((row) => (
                    <tr key={row.key}>
                      <td className="px-3 py-1.5">{label(row.key)}</td>
                      <td className="px-3 py-1.5 tabular-nums">{row.members}</td>
                      <td className="min-w-[8rem] px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-9 tabular-nums">{pct(row.avgRate)}</span>
                          <Bar value={row.avgRate} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
