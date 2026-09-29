'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, Minus, MonitorSmartphone, Plus, Search } from 'lucide-react';
import type {
  RollCallGroupDetail,
  RollCallMemberInfo,
  RollCallSessionDetail,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authFetch } from '@/lib/auth';
import { downloadCsv, groupApi, todayIso } from '../roll-call-api';
import { useRollCallT } from '../messages';
import { Countdown } from '../countdown';
import { useSmartT } from '../smart-messages';

/** How often an open roll call picks up self check-ins from the kiosk. */
const POLL_MS = 8000;

interface TakeRollProps {
  readonly group: RollCallGroupDetail;
  readonly sessionId: string | null;
  readonly onSessionChange: (id: string) => void;
  readonly onMembersAdded: (members: RollCallMemberInfo[]) => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function TakeRoll({ group, sessionId, onSessionChange, onMembersAdded }: TakeRollProps) {
  const t = useRollCallT();
  const st = useSmartT();
  const [session, setSession] = useState<RollCallSessionDetail | null>(null);
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [guests, setGuests] = useState(0);
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(todayIso());
  const [newLabel, setNewLabel] = useState('');
  const [query, setQuery] = useState('');
  const [walkIn, setWalkIn] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ticks on their way to the server; polling waits for them. */
  const pending = useRef(0);
  const api = groupApi(group.id);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      return;
    }
    void authFetch<{ data: RollCallSessionDetail }>(`${api}/sessions/${sessionId}`)
      .then((res) => {
        setSession(res.data);
        setPresent(new Set(res.data.presentIds));
        setGuests(res.data.guestCount);
        setLabel(res.data.label);
        setDate(res.data.date);
        setSaveState('idle');
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t.failed));
  }, [api, sessionId, t.failed]);

  // Pick up people who checked themselves in at the kiosk.
  const openId = session?.id;
  useEffect(() => {
    if (!openId) return;
    const id = setInterval(() => {
      if (pending.current > 0 || document.hidden) return;
      void authFetch<{ data: RollCallSessionDetail }>(`${api}/sessions/${openId}`)
        .then((res) => {
          if (pending.current === 0) setPresent(new Set(res.data.presentIds));
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [api, openId]);

  // Date, label and guests; marks are saved one at a time by `mark`.
  const save = useCallback(
    (next: { guests: number; label: string; date: string }) => {
      if (!session) return;
      if (timer.current) clearTimeout(timer.current);
      setSaveState('saving');
      timer.current = setTimeout(() => {
        authFetch(`${api}/sessions/${session.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            date: next.date,
            label: next.label.trim(),
            guestCount: next.guests,
          }),
        })
          .then(() => setSaveState('saved'))
          .catch(() => setSaveState('error'));
      }, 600);
    },
    [api, session],
  );

  const update = (patch: Partial<{ guests: number; label: string; date: string }>) => {
    const next = { guests, label, date, ...patch };
    if (patch.guests !== undefined) setGuests(patch.guests);
    if (patch.label !== undefined) setLabel(patch.label);
    if (patch.date !== undefined) setDate(patch.date);
    save(next);
  };

  /** Ticks or unticks one person without overwriting anyone else's mark. */
  const mark = (id: string, on: boolean) => {
    if (!session) return;
    setPresent((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    pending.current++;
    setSaveState('saving');
    authFetch(`${api}/sessions/${session.id}/marks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ present: on }),
    })
      .then(() => setSaveState('saved'))
      .catch(() => {
        setSaveState('error');
        setPresent((prev) => {
          const next = new Set(prev);
          if (on) next.delete(id);
          else next.add(id);
          return next;
        });
      })
      .finally(() => {
        pending.current--;
      });
  };

  const toggle = (id: string) => mark(id, !present.has(id));

  const start = async () => {
    setError(null);
    try {
      const res = await authFetch<{ data: RollCallSessionDetail }>(`${api}/sessions`, {
        method: 'POST',
        body: JSON.stringify({ date, label: newLabel.trim() }),
      });
      onSessionChange(res.data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.failed);
    }
  };

  const addNames = async (names: string[]): Promise<RollCallMemberInfo[]> => {
    const res = await authFetch<{ data: RollCallMemberInfo[] }>(`${api}/members`, {
      method: 'POST',
      body: JSON.stringify({ members: names.map((name) => ({ name })) }),
    });
    onMembersAdded(res.data);
    return res.data;
  };

  const addWalkIn = async () => {
    const name = walkIn.trim();
    if (!name) return;
    try {
      const [member] = await addNames([name]);
      setWalkIn('');
      if (member) mark(member.id, true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.failed);
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t.startHint}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roll-date">{t.date}</Label>
            <Input
              id="roll-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="roll-label">{t.label}</Label>
            <Input
              id="roll-label"
              value={newLabel}
              maxLength={100}
              placeholder={t.labelPlaceholder}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <Button onClick={() => void start()} disabled={!date}>
            <Check className="mr-2 size-4" />
            {t.start}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  const active = group.members.filter((m) => m.active || present.has(m.id));
  const q = query.trim().toLowerCase();
  const shown = q ? active.filter((m) => m.name.toLowerCase().includes(q)) : active;
  const count = active.filter((m) => present.has(m.id)).length;
  const rate = active.length ? ((count / active.length) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-date">{t.date}</Label>
          <Input
            id="session-date"
            type="date"
            value={date}
            onChange={(e) => e.target.value && update({ date: e.target.value })}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="session-label">{t.label}</Label>
          <Input
            id="session-label"
            value={label}
            maxLength={100}
            placeholder={t.labelPlaceholder}
            onChange={(e) => update({ label: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t.guests}</Label>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="size-9"
              aria-label="−"
              onClick={() => update({ guests: Math.max(0, guests - 1) })}
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-10 text-center text-sm font-medium tabular-nums">{guests}</span>
            <Button
              size="icon"
              variant="outline"
              className="size-9"
              aria-label="+"
              onClick={() => update({ guests: guests + 1 })}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <Countdown />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-sky-500/10 px-4 py-2 text-sm">
        <span className="font-semibold">{t.stats(count, active.length)}</span>
        <span className="text-muted-foreground">{t.rate(rate)}</span>
        {guests > 0 && (
          <span className="text-muted-foreground">
            + {guests} {t.guests}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {saveState === 'saving' && t.saving}
          {saveState === 'saved' && t.saved}
          {saveState === 'error' && <span className="text-destructive">{t.failed}</span>}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={t.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" asChild title={st.kioskHint}>
          <Link href={`/roll-call/${group.id}/kiosk?session=${session.id}`}>
            <MonitorSmartphone className="mr-2 size-4" />
            {st.openKiosk}
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(`${group.name}_${date}.csv`, [
              ['姓名 Name', '出席狀態 Status'],
              ...active.map((m) => [m.name, present.has(m.id) ? '出席' : '缺席']),
              ...(guests > 0 ? [['來賓 Guests', guests]] : []),
            ])
          }
        >
          <Download className="mr-2 size-4" />
          {t.exportCsv}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {active.length === 0 && <p className="text-sm text-muted-foreground">{t.noMembers}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {shown.map((m) => {
          const on = present.has(m.id);
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(m.id)}
              className={`rounded-lg border px-3 py-3 text-center text-sm transition-colors ${
                on ? 'border-emerald-500 bg-emerald-500/15 font-medium' : 'hover:bg-muted'
              }`}
            >
              <span className="block truncate">{m.name}</span>
              <span className="text-xs text-muted-foreground">{on ? t.present : t.absent}</span>
            </button>
          );
        })}
      </div>

      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void addWalkIn();
        }}
      >
        <Input
          value={walkIn}
          maxLength={100}
          placeholder={t.addWalkInPlaceholder}
          aria-label={t.addWalkIn}
          onChange={(e) => setWalkIn(e.target.value)}
        />
        <Button type="submit" variant="outline" disabled={!walkIn.trim()}>
          <Plus className="mr-1.5 size-4" />
          {t.add}
        </Button>
      </form>
    </div>
  );
}
