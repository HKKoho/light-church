'use client';

import { useEffect, useState } from 'react';
import { HeartHandshake, Loader2, TrendingDown, TrendingUp, UserX, MoveRight } from 'lucide-react';
import type { RollCallAlert, RollCallInsights } from '@clawix/shared';
import { authFetch } from '@/lib/auth';
import { groupApi } from '../roll-call-api';
import { useRollCallT, type RollCallT } from '../messages';

const pct = (r: number) => Math.round(r * 100);

function alertText(t: RollCallT, a: RollCallAlert): string {
  const detail = [
    a.previousRate > 0 ? t.usually(pct(a.previousRate)) : null,
    a.lastPresent ? t.lastSeen(a.lastPresent) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const headline =
    a.kind === 'missing'
      ? t.missing(a.streak)
      : a.kind === 'returned'
        ? t.returned(a.streak)
        : t.declining;
  return detail ? `${headline} — ${detail}` : headline;
}

const TONE: Record<RollCallAlert['kind'], string> = {
  missing: 'border-amber-500/50 bg-amber-500/10',
  declining: 'border-orange-500/40 bg-orange-500/5',
  returned: 'border-emerald-500/50 bg-emerald-500/10',
};

export function InsightsPanel({ groupId }: { groupId: string }) {
  const t = useRollCallT();
  const [data, setData] = useState<RollCallInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch<{ data: RollCallInsights }>(`${groupApi(groupId)}/insights`)
      .then((res) => setData(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t.failed));
  }, [groupId, t.failed]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <Loader2 className="size-5 animate-spin text-muted-foreground" />;

  const max = Math.max(1, ...data.trend.map((p) => p.present + p.guests));
  const f = data.forecast;
  const Direction =
    f?.direction === 'rising' ? TrendingUp : f?.direction === 'falling' ? TrendingDown : MoveRight;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-muted-foreground">{t.careIntro}</p>

      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <HeartHandshake className="size-4" />
          {t.alerts}
        </h3>
        {data.alerts.length === 0 && <p className="text-sm text-muted-foreground">{t.noAlerts}</p>}
        <ul className="grid gap-2 md:grid-cols-2">
          {data.alerts.map((a) => (
            <li key={a.memberId} className={`rounded-md border px-3 py-2 text-sm ${TONE[a.kind]}`}>
              <p className="font-medium">{a.name}</p>
              <p className="text-xs text-muted-foreground">{alertText(t, a)}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.trend}</h3>
          {data.trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noSessions}</p>
          ) : (
            <div className="flex h-40 items-end gap-1.5 rounded-md border p-3">
              {data.trend.map((p) => (
                <div
                  key={p.date}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${p.date}: ${p.present} + ${p.guests}`}
                >
                  <div className="flex w-full flex-1 flex-col justify-end">
                    <div
                      className="w-full rounded-t bg-sky-300/60"
                      style={{ height: `${(p.guests / max) * 100}%` }}
                    />
                    <div
                      className="w-full bg-sky-500"
                      style={{ height: `${(p.present / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {p.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.forecast}</h3>
          {f ? (
            <div className="flex flex-col gap-1 rounded-md border p-4">
              <p className="text-lg font-semibold">{t.expected(f.expected, f.low, f.high)}</p>
              {f.expectedGuests > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t.expectedGuests(f.expectedGuests)}
                </p>
              )}
              <p className="flex items-center gap-1.5 text-sm">
                <Direction className="size-4" />
                {t.direction[f.direction]}
              </p>
              <p className="text-xs text-muted-foreground">{t.basedOn(f.basedOn)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.needMore}</p>
          )}
        </section>
      </div>

      {data.neverAttended.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <UserX className="size-4" />
            {t.neverAttended}
          </h3>
          <p className="text-sm text-muted-foreground">
            {data.neverAttended.map((m) => m.name).join('、')}
          </p>
        </section>
      )}
    </div>
  );
}
