'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, RefreshCw, Trash2, Upload, Users } from 'lucide-react';
import type { SimpleRollCall as SimpleList } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { authFetch } from '@/lib/auth';
import { Countdown } from './countdown';
import { ROLL_CALL_API, downloadCsv, parseCsv, todayIso } from './roll-call-api';
import { useRollCallT } from './messages';

const SIMPLE_API = `${ROLL_CALL_API}/simple`;
const EMPTY: SimpleList = { fileName: '', members: [], present: {} };
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Simple mode — the original 茶果嶺浸信會點名應用程式 as a Light Church page:
 * one list per user, tap to mark, count, export. Saved to the account.
 */
export function SimpleRollCall() {
  const t = useRollCallT();
  const [list, setList] = useState<SimpleList | null>(null);
  const [name, setName] = useState('');
  const [added, setAdded] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    authFetch<{ data: SimpleList }>(SIMPLE_API)
      .then((res) => setList(res.data))
      .catch(() => setList(EMPTY));
  }, []);

  const update = useCallback((next: SimpleList) => {
    setList(next);
    setSaving('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      authFetch(SIMPLE_API, { method: 'PUT', body: JSON.stringify(next) })
        .then(() => setSaving('saved'))
        .catch(() => setSaving('error'));
    }, 500);
  }, []);

  if (!list) return <Loader2 className="size-5 animate-spin text-muted-foreground" />;

  const presentCount = list.members.filter((m) => list.present[m.id]).length;
  const rate = list.members.length
    ? ((presentCount / list.members.length) * 100).toFixed(1)
    : '0.0';

  const addName = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    update({ ...list, members: [...list.members, { id: newId(), name: trimmed.slice(0, 100) }] });
    setName('');
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const importList = async (file: File | undefined) => {
    if (!file) return;
    const names = parseCsv(await file.text())
      .map((r) => r[0]?.trim() ?? '')
      .filter((n) => n && n !== '姓名' && !/^name$/i.test(n));
    update({
      ...list,
      fileName: file.name.slice(0, 200),
      members: [...list.members, ...names.map((n) => ({ id: newId(), name: n.slice(0, 100) }))],
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const without = (id: string) =>
    Object.fromEntries(Object.entries(list.present).filter(([key]) => key !== id));

  const toggle = (id: string) =>
    update({
      ...list,
      present: list.present[id] ? without(id) : { ...list.present, [id]: new Date().toISOString() },
    });

  const remove = (id: string) =>
    update({ ...list, members: list.members.filter((m) => m.id !== id), present: without(id) });

  // Same columns as the original app, so the file imports into Smart mode's History.
  const exportList = () =>
    downloadCsv(`${t.simpleTitle}_${todayIso()}.csv`, [
      ['姓名', '出席狀態', '時間'],
      ...list.members.map((m) => [
        m.name,
        list.present[m.id] ? '出席' : '缺席',
        list.present[m.id] ?? '',
      ]),
    ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{t.simpleTitle}</h2>
        {list.fileName && (
          <p className="text-sm text-muted-foreground">{t.simpleList(list.fileName)}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Countdown />
        {list.members.length > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-sky-500/10 px-3 py-1.5 text-sm">
            <Users className="size-4 text-sky-600" />
            <span className="font-medium">{t.stats(presentCount, list.members.length)}</span>
            <span className="text-muted-foreground">{t.rate(rate)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={exportList} disabled={list.members.length === 0}>
          <Download className="mr-2 size-4" />
          {t.simpleExport}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={list.members.length === 0}>
              <RefreshCw className="mr-2 size-4" />
              {t.simpleReset}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.simpleResetTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.simpleResetBody}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={() => update(EMPTY)}>{t.simpleReset}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addName();
        }}
      >
        <Input
          value={name}
          maxLength={100}
          placeholder={t.addWalkInPlaceholder}
          aria-label={t.addWalkIn}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={!name.trim()}>
          {t.add}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv"
          className="hidden"
          onChange={(e) => void importList(e.target.files?.[0])}
        />
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 size-4" />
          {t.simpleImport}
        </Button>
      </form>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="text-emerald-600">{added ? t.simpleAdded : ''}</span>
        <span>
          {saving === 'saving' && t.saving}
          {saving === 'saved' && t.saved}
          {saving === 'error' && <span className="text-destructive">{t.failed}</span>}
        </span>
      </div>

      {list.members.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          {t.simpleEmpty}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.members.map((m) => {
            const on = !!list.present[m.id];
            return (
              <div key={m.id} className="group relative">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(m.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-center text-sm transition-colors ${
                    on ? 'border-emerald-500 bg-emerald-500/15 font-medium' : 'hover:bg-muted'
                  }`}
                >
                  <span className="block truncate">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{on ? t.present : t.absent}</span>
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      aria-label={t.simpleDelete(m.name)}
                      className="absolute right-1 top-1 rounded-full p-1 opacity-0 transition-opacity hover:bg-destructive/10 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.simpleDelete(m.name)}</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(m.id)}>{t.delete}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">{t.simpleHint}</p>
    </div>
  );
}
