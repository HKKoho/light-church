'use client';

import { useState } from 'react';
import type { RollCallMemberInfo, RollCallSheetName } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRollCallT } from '../messages';

const selectClass =
  'h-8 max-w-[14rem] rounded-md border border-input bg-transparent px-2 text-sm shadow-xs';

export interface SheetDecision {
  /** Existing members to mark present. */
  readonly memberIds: string[];
  /** Names to add as new members, then mark present. */
  readonly newNames: string[];
}

interface Row {
  text: string;
  include: boolean;
  /** Member id, or '' to add as a new member. */
  target: string;
}

/** Lets the person check what the local AI read before anything is marked. */
export function SheetReview({
  names,
  members,
  onApply,
  onClose,
}: {
  names: readonly RollCallSheetName[];
  members: readonly RollCallMemberInfo[];
  onApply: (decision: SheetDecision) => void;
  onClose: () => void;
}) {
  const t = useRollCallT();
  const [rows, setRows] = useState<Row[]>(() =>
    names.map((n) => ({ text: n.text, include: true, target: n.memberId ?? '' })),
  );
  const active = members.filter((m) => m.active);
  const set = (i: number, patch: Partial<Row>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.include);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.sheetTitle}</DialogTitle>
          <DialogDescription>{t.sheetCheck}</DialogDescription>
        </DialogHeader>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{t.sheetNone}</p>}
        <ul className="flex flex-col divide-y">
          {rows.map((r, i) => (
            <li key={`${r.text}-${i}`} className="flex items-center gap-2 py-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={r.include}
                aria-label={r.text}
                onChange={(e) => set(i, { include: e.target.checked })}
              />
              <span className="min-w-0 flex-1 truncate font-medium">{r.text}</span>
              <select
                className={selectClass}
                value={r.target}
                aria-label={r.target ? t.sheetMatched : t.sheetNew}
                onChange={(e) => set(i, { target: e.target.value })}
              >
                <option value="">{t.sheetAddNew}</option>
                {active.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button
            disabled={chosen.length === 0}
            onClick={() =>
              onApply({
                memberIds: chosen.filter((r) => r.target).map((r) => r.target),
                newNames: chosen.filter((r) => !r.target).map((r) => r.text),
              })
            }
          >
            {t.sheetApply(chosen.length)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
