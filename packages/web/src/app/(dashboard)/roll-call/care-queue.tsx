'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HandHeart, HeartHandshake, Loader2 } from 'lucide-react';
import type { RollCallCareQueue } from '@clawix/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/auth';
import { alertText, TONE } from './[groupId]/insights-panel';
import { ROLL_CALL_API } from './roll-call-api';
import { useRollCallT } from './messages';
import { useSmartT } from './smart-messages';

/** Rows shown per list before "and N more". */
const SHOWN = 6;

/** Open follow-ups and first-timers from every group, for pastors and leaders. */
export function CareQueue() {
  const t = useRollCallT();
  const s = useSmartT();
  const [queue, setQueue] = useState<RollCallCareQueue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch<{ data: RollCallCareQueue }>(`${ROLL_CALL_API}/care`)
      .then((res) => setQueue(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t.failed));
  }, [t.failed]);

  const empty = queue?.alerts.length === 0 && queue.firstTimers.length === 0;

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartHandshake className="size-4 text-amber-600" />
          {s.careQueue}
        </CardTitle>
        <CardDescription>{s.careQueueHint}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!queue && !error && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {empty && <p className="text-sm text-muted-foreground">{s.careQueueEmpty}</p>}
        {queue && queue.alerts.length > 0 && (
          <ul className="grid gap-2 md:grid-cols-2">
            {queue.alerts.slice(0, SHOWN).map((a) => (
              <li
                key={`${a.groupId}-${a.memberId}`}
                className={`rounded-md border px-3 py-2 text-sm ${TONE[a.kind]}`}
              >
                <Link href={`/roll-call/${a.groupId}?tab=care`} className="hover:underline">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground"> · {a.groupName}</span>
                </Link>
                <p className="text-xs text-muted-foreground">{alertText(t, a)}</p>
              </li>
            ))}
          </ul>
        )}
        {queue && queue.alerts.length > SHOWN && (
          <p className="text-xs text-muted-foreground">
            {s.careQueueMore(queue.alerts.length - SHOWN)}
          </p>
        )}
        {queue && queue.firstTimers.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <HandHeart className="size-4 text-violet-600" />
              {s.firstTimers}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {queue.firstTimers.slice(0, SHOWN * 2).map((f) => (
                <li key={`${f.groupId}-${f.id}`}>
                  <Link
                    href={`/roll-call/${f.groupId}?tab=care`}
                    className="block rounded-md border border-violet-500/40 bg-violet-500/5 px-3 py-1.5 text-sm hover:bg-violet-500/10"
                  >
                    <span className="font-medium">{f.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {' '}
                      · {f.groupName} · {f.firstDate}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
