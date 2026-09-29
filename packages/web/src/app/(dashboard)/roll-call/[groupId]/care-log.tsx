'use client';

import { useState } from 'react';
import { Check, History, Loader2 } from 'lucide-react';
import {
  ROLL_CALL_CARE_KINDS,
  type RollCallCareKind,
  type RollCallCareNoteInfo,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/auth';
import { groupApi } from '../roll-call-api';
import { useRollCallT } from '../messages';
import { useSmartT } from '../smart-messages';

const selectClass = 'h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs';

/** A member's past follow-ups, loaded when opened. */
function CareHistory({ groupId, memberId }: { groupId: string; memberId: string }) {
  const s = useSmartT();
  const [notes, setNotes] = useState<RollCallCareNoteInfo[] | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    setOpen(!open);
    if (open || notes) return;
    authFetch<{ data: RollCallCareNoteInfo[] }>(`${groupApi(groupId)}/members/${memberId}/care`)
      .then((res) => setNotes(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        onClick={toggle}
      >
        <History className="size-3.5" />
        {s.careHistory}
      </button>
      {open && !notes && !error && <Loader2 className="size-3.5 animate-spin" />}
      {open && error && <p className="text-xs text-destructive">{error}</p>}
      {open && notes?.length === 0 && (
        <p className="text-xs text-muted-foreground">{s.careHistoryEmpty}</p>
      )}
      {open && notes && notes.length > 0 && (
        <ol className="flex flex-col gap-1 border-l pl-3 text-xs">
          {notes.map((n) => (
            <li key={n.id}>
              <span className="font-medium">{s.careKinds[n.kind]}</span>
              <span className="text-muted-foreground">
                {' · '}
                {n.createdAt.slice(0, 10)}
                {n.author && ` · ${s.careBy(n.author)}`}
              </span>
              {n.note && <span> — {n.note}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

interface FollowUpCardProps {
  readonly groupId: string;
  readonly memberId: string;
  readonly name: string;
  readonly detail: string;
  readonly tone: string;
  /** Button text: "Mark followed up" or, for a first-timer, "Mark welcomed". */
  readonly action?: string;
  readonly onDone: () => void;
}

/** One person to reach out to: record how and a short note, see past follow-ups. */
export function FollowUpCard({
  groupId,
  memberId,
  name,
  detail,
  tone,
  action,
  onDone,
}: FollowUpCardProps) {
  const t = useRollCallT();
  const s = useSmartT();
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<RollCallCareKind>('call');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await authFetch(`${groupApi(groupId)}/members/${memberId}/follow-up`, {
        method: 'POST',
        body: JSON.stringify({ kind, note: note.trim() }),
      });
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`flex flex-col gap-2 rounded-md border px-3 py-2 text-sm ${tone}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        {!open && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 text-xs"
            onClick={() => setOpen(true)}
          >
            <Check className="mr-1 size-3.5" />
            {action ?? t.markFollowedUp}
          </Button>
        )}
      </div>
      {open && (
        <div className="flex flex-wrap gap-2">
          <select
            className={selectClass}
            value={kind}
            aria-label={s.careHow}
            onChange={(e) => setKind(e.target.value as RollCallCareKind)}
          >
            {ROLL_CALL_CARE_KINDS.map((k) => (
              <option key={k} value={k}>
                {s.careKinds[k]}
              </option>
            ))}
          </select>
          <Input
            className="h-8 min-w-[10rem] flex-1"
            value={note}
            maxLength={500}
            placeholder={t.followUpNotePlaceholder}
            aria-label={t.note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" className="h-8" disabled={busy} onClick={() => void save()}>
            {t.save}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <CareHistory groupId={groupId} memberId={memberId} />
    </li>
  );
}
