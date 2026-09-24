'use client';

import { useRef, useState } from 'react';
import { Check, Copy, Loader2, Pencil, Plus, RotateCcw, Upload, UserMinus } from 'lucide-react';
import {
  ROLL_CALL_SEXES,
  type RollCallDuplicate,
  type RollCallGroupDetail,
  type RollCallMemberInfo,
  type RollCallSex,
} from '@clawix/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { ageOf, groupApi, parsePeople } from '../roll-call-api';
import { useRollCallT } from '../messages';

interface MembersProps {
  readonly group: RollCallGroupDetail;
  readonly aiReady: boolean;
  readonly onChanged: () => void;
}

type MemberPatch = Partial<
  Pick<RollCallMemberInfo, 'name' | 'note' | 'active' | 'sex' | 'birthYear'>
>;

const selectClass = 'h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs';

function MemberRow({
  member,
  canManage,
  onSave,
}: {
  member: RollCallMemberInfo;
  canManage: boolean;
  onSave: (patch: MemberPatch) => Promise<void>;
}) {
  const t = useRollCallT();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [note, setNote] = useState(member.note);
  const [sex, setSex] = useState<RollCallSex>(member.sex);
  const [year, setYear] = useState(member.birthYear === null ? '' : String(member.birthYear));
  const age = ageOf(member.birthYear);
  const thisYear = new Date().getFullYear();
  const yearNum = Number(year);
  const yearOk =
    year === '' || (Number.isInteger(yearNum) && yearNum >= 1900 && yearNum <= thisYear);

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 px-3 py-2">
        <Input
          className="h-8 max-w-[12rem]"
          value={name}
          maxLength={100}
          aria-label={t.rename}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className={selectClass}
          value={sex}
          aria-label={t.sex}
          onChange={(e) => setSex(e.target.value as RollCallSex)}
        >
          {ROLL_CALL_SEXES.map((s) => (
            <option key={s || 'none'} value={s}>
              {t.sexes[s]}
            </option>
          ))}
        </select>
        <Input
          className="h-8 w-28"
          inputMode="numeric"
          value={year}
          maxLength={4}
          placeholder={t.birthYear}
          aria-label={t.birthYear}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
        />
        <Input
          className="h-8 min-w-[10rem] flex-1"
          value={note}
          maxLength={500}
          placeholder={t.note}
          aria-label={t.note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          size="sm"
          disabled={!name.trim() || !yearOk}
          onClick={() =>
            void onSave({
              name: name.trim(),
              note: note.trim(),
              sex,
              birthYear: year === '' ? null : yearNum,
            }).then(() => setEditing(false))
          }
        >
          <Check className="mr-1 size-3.5" />
          {t.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          {t.cancel}
        </Button>
      </li>
    );
  }
  return (
    <li
      className={`flex items-center gap-2 px-3 py-2 text-sm ${member.active ? '' : 'text-muted-foreground'}`}
    >
      <span className="font-medium">{member.name}</span>
      {(member.sex || age !== null) && (
        <span className="text-xs text-muted-foreground">
          {[t.sexShort[member.sex], age !== null ? t.age(age) : ''].filter(Boolean).join(' · ')}
        </span>
      )}
      {member.note && <span className="truncate text-xs text-muted-foreground">{member.note}</span>}
      {!member.active && <Badge variant="secondary">{t.inactive}</Badge>}
      {canManage && (
        <span className="ml-auto flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={t.rename}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={member.active ? t.deactivate : t.reactivate}
            title={member.active ? t.deactivate : t.reactivate}
            onClick={() => void onSave({ active: !member.active })}
          >
            {member.active ? (
              <UserMinus className="size-3.5" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
          </Button>
        </span>
      )}
    </li>
  );
}

export function MembersPanel({ group, aiReady, onChanged }: MembersProps) {
  const t = useRollCallT();
  const api = groupApi(group.id);
  const [text, setText] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<'add' | 'dupes' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dupes, setDupes] = useState<RollCallDuplicate[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (kind: 'add' | 'dupes', action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(null);
    }
  };

  const addPeople = (source: string) =>
    run('add', async () => {
      const members = parsePeople(source);
      if (members.length === 0) return;
      await authFetch(`${api}/members`, { method: 'POST', body: JSON.stringify({ members }) });
      setText('');
      onChanged();
    });

  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    await addPeople(await file.text());
    if (fileRef.current) fileRef.current.value = '';
  };

  const saveMember = async (id: string, patch: object) => {
    setError(null);
    try {
      await authFetch(`${api}/members/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.failed);
    }
  };

  const findDupes = (useAi: boolean) =>
    run('dupes', async () => {
      setDupes(
        (await authFetch<{ data: RollCallDuplicate[] }>(`${api}/duplicates${useAi ? '?ai=1' : ''}`))
          .data,
      );
    });

  const merge = (keepId: string, mergeId: string) =>
    run('dupes', async () => {
      await authFetch(`${api}/merge`, {
        method: 'POST',
        body: JSON.stringify({ keepId, mergeId }),
      });
      setDupes((d) => d?.filter((p) => ![p.a.id, p.b.id].includes(mergeId)) ?? null);
      onChanged();
    });

  const q = query.trim().toLowerCase();
  const shown = group.members.filter(
    (m) => (showInactive || m.active) && (!q || m.name.toLowerCase().includes(q)),
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t.addNames}</h3>
        <p className="text-xs text-muted-foreground">{t.addNamesHint}</p>
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={t.addNames}
        />
        <div className="flex gap-2">
          <Button disabled={busy === 'add' || !text.trim()} onClick={() => void addPeople(text)}>
            {busy === 'add' ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            {t.add}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void importCsv(e.target.files?.[0])}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 size-4" />
            {t.importCsv}
          </Button>
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {group.canManage && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Copy className="size-4" />
            {t.duplicates}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy === 'dupes'}
              onClick={() => void findDupes(false)}
            >
              {t.findDuplicates}
            </Button>
            {aiReady && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy === 'dupes'}
                onClick={() => void findDupes(true)}
              >
                {busy === 'dupes' && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                {t.findDuplicatesAi}
              </Button>
            )}
          </div>
          {dupes?.length === 0 && <p className="text-sm text-muted-foreground">{t.noDuplicates}</p>}
          <ul className="flex flex-col gap-2">
            {dupes?.map((p) => (
              <li
                key={`${p.a.id}-${p.b.id}`}
                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-medium">{p.a.name}</span>
                <span className="text-muted-foreground">≈</span>
                <span className="font-medium">{p.b.name}</span>
                <Badge variant={p.source === 'ai' ? 'default' : 'secondary'}>
                  {p.source === 'ai' ? t.aiSuggestion : t.spelling}
                </Badge>
                <span className="text-xs text-muted-foreground">{p.reason}</span>
                <span className="ml-auto flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    title={t.mergeInto(p.a.name, p.b.name)}
                    onClick={() => void merge(p.a.id, p.b.id)}
                  >
                    {t.merge} → {p.a.name}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title={t.mergeInto(p.b.name, p.a.name)}
                    onClick={() => void merge(p.b.id, p.a.id)}
                  >
                    {t.merge} → {p.b.name}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold">{t.members(group.memberCount)}</h3>
          <Input
            className="h-8 max-w-xs"
            placeholder={t.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            {t.showInactive}
          </label>
        </div>
        <ul className="divide-y rounded-md border">
          {shown.map((m) => (
            <MemberRow
              key={`${m.id}-${m.name}-${m.note}-${m.active}-${m.sex}-${m.birthYear}`}
              member={m}
              canManage={group.canManage}
              onSave={(patch) => saveMember(m.id, patch)}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
