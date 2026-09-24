'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FolderOpen, Loader2, Trash2, Upload } from 'lucide-react';
import type {
  RollCallGroupDetail,
  RollCallMemberInfo,
  RollCallSessionDetail,
  RollCallSessionSummary,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { downloadCsv, groupApi, nameKey, parseQuickRollCallCsv, todayIso } from '../roll-call-api';
import { useRollCallT } from '../messages';

interface HistoryProps {
  readonly group: RollCallGroupDetail;
  readonly onOpen: (sessionId: string) => void;
  readonly onMembersAdded: (members: RollCallMemberInfo[]) => void;
}

export function HistoryPanel({ group, onOpen, onMembersAdded }: HistoryProps) {
  const t = useRollCallT();
  const api = groupApi(group.id);
  const [sessions, setSessions] = useState<RollCallSessionSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setSessions((await authFetch<{ data: RollCallSessionSummary[] }>(`${api}/sessions`)).data);
    } catch (err: unknown) {
      setNotice({ error: true, text: err instanceof Error ? err.message : t.failed });
    }
  }, [api, t.failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    try {
      await authFetch(`${api}/sessions/${id}`, { method: 'DELETE' });
      await load();
    } catch (err: unknown) {
      setNotice({ error: true, text: err instanceof Error ? err.message : t.failed });
    }
  };

  /** Brings a Quick Roll Call export into this group's history. */
  const importQuick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setNotice(null);
    try {
      const { names, present, date } = parseQuickRollCallCsv(await file.text());
      if (names.length === 0) throw new Error(t.noMembers);
      const members = (
        await authFetch<{ data: RollCallMemberInfo[] }>(`${api}/members`, {
          method: 'POST',
          body: JSON.stringify({ names }),
        })
      ).data;
      onMembersAdded(members);
      const byKey = new Map(members.map((m) => [nameKey(m.name), m.id]));
      const presentIds = [
        ...new Set(present.map((n) => byKey.get(nameKey(n))).filter((id): id is string => !!id)),
      ];
      const session = (
        await authFetch<{ data: RollCallSessionDetail }>(`${api}/sessions`, {
          method: 'POST',
          body: JSON.stringify({
            date: date ?? todayIso(),
            label: file.name.replace(/\.csv$/i, '').slice(0, 100),
          }),
        })
      ).data;
      await authFetch(`${api}/sessions/${session.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: session.date,
          label: session.label,
          guestCount: 0,
          presentIds,
        }),
      });
      setNotice({ error: false, text: t.imported(presentIds.length, names.length) });
      await load();
    } catch (err: unknown) {
      setNotice({ error: true, text: err instanceof Error ? err.message : t.failed });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /** Everyone × every roll call, as a spreadsheet. */
  const exportGrid = async () => {
    const list = [...(sessions ?? [])].reverse();
    const details = await Promise.all(
      list.map((s) =>
        authFetch<{ data: RollCallSessionDetail }>(`${api}/sessions/${s.id}`).then((r) => r.data),
      ),
    );
    const sets = details.map((d) => new Set(d.presentIds));
    downloadCsv(`${group.name}_attendance.csv`, [
      ['姓名 Name', ...details.map((d) => (d.label ? `${d.date} ${d.label}` : d.date)), 'Total'],
      ...group.members.map((m) => {
        const marks = sets.map((s) => (s.has(m.id) ? 1 : 0));
        return [m.name, ...marks, marks.reduce<number>((a, b) => a + b, 0)];
      }),
      ['來賓 Guests', ...details.map((d) => d.guestCount), ''],
    ]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void importQuick(e.target.files?.[0])}
        />
        <Button
          variant="outline"
          disabled={busy}
          title={t.importHint}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Upload className="mr-2 size-4" />
          )}
          {t.importQuick}
        </Button>
        <Button variant="outline" disabled={!sessions?.length} onClick={() => void exportGrid()}>
          <Download className="mr-2 size-4" />
          {t.exportAll}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t.importHint}</p>
      {notice && (
        <p className={`text-sm ${notice.error ? 'text-destructive' : 'text-emerald-600'}`}>
          {notice.text}
        </p>
      )}
      {sessions === null && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      {sessions?.length === 0 && <p className="text-sm text-muted-foreground">{t.noSessions}</p>}
      <ul className="divide-y rounded-md border">
        {sessions?.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
            <span className="font-medium tabular-nums">{s.date}</span>
            {s.label && <span className="text-muted-foreground">{s.label}</span>}
            <span className="ml-auto text-muted-foreground">
              {t.stats(s.presentCount, group.memberCount)}
              {s.guestCount > 0 && ` + ${s.guestCount}`}
            </span>
            <Button size="sm" variant="outline" onClick={() => onOpen(s.id)}>
              <FolderOpen className="mr-1.5 size-3.5" />
              {t.openSession}
            </Button>
            {group.canManage && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-destructive"
                aria-label={t.deleteSession}
                onClick={() => void remove(s.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
