'use client';

import { useEffect, useState } from 'react';
import { saveWisdomCycleSchema, type WisdomCycleInfo } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useWisdomT } from './messages';
import { ErrorBanner, Field, errorMessage } from './shared';

type Form = Omit<WisdomCycleInfo, 'id' | 'courseId'>;

/** Create (`cycle` = 'new') or edit a cycle; `null` keeps the dialog closed. */
export function CycleDialog({
  courseId,
  cycle,
  nextOrder,
  onClose,
  onSaved,
}: {
  courseId: string;
  cycle: WisdomCycleInfo | 'new' | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useWisdomT();
  const [form, setForm] = useState<Form>({ title: '', description: '', sortOrder: nextOrder });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (cycle === 'new') setForm({ title: '', description: '', sortOrder: nextOrder });
    else if (cycle)
      setForm({ title: cycle.title, description: cycle.description, sortOrder: cycle.sortOrder });
  }, [cycle, nextOrder]);

  const save = async () => {
    const parsed = saveWisdomCycleSchema.safeParse({ ...form, courseId });
    if (!parsed.success) {
      setError(t.invalid);
      return;
    }
    setBusy(true);
    try {
      const editing = cycle && cycle !== 'new';
      await authFetch(`/api/v1/wisdom/admin/cycles${editing ? `/${cycle.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(parsed.data),
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!cycle} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cycle === 'new' ? t.newCycle : t.editCycle}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ErrorBanner message={error} />
          <Field id="cycle-title" label={t.cycleTitle}>
            <Input
              id="cycle-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field id="cycle-description" label={t.cycleDescription}>
            <Textarea
              id="cycle-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field id="cycle-order" label={t.order} className="w-32">
            <Input
              id="cycle-order"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
