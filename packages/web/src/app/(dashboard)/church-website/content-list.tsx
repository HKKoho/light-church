'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authFetch } from '@/lib/auth';
import { useChurchWebT } from './messages';
import { DeleteButton, ErrorBanner, errorMessage } from './shared';

/** The slice of a Zod schema this list needs (web has no direct zod dependency). */
interface Validator<F> {
  safeParse(
    value: unknown,
  ): { success: true; data: F } | { success: false; error: { issues: { path: PropertyKey[] }[] } };
}

interface Item {
  readonly id: string;
  readonly title: string;
  readonly visibility: 'public' | 'members' | 'hidden';
}

interface Props<T extends Item, F> {
  /** e.g. /api/v1/church-site/events */
  readonly api: string;
  readonly schema: Validator<F>;
  readonly empty: () => F;
  readonly toForm: (item: T) => F;
  readonly labels: { add: string; edit: string; none: string };
  readonly subtitle: (item: T) => string;
  readonly renderForm: (form: F, set: (patch: Partial<F>) => void) => ReactNode;
}

/** List, add, edit and delete site events or media. */
export function ContentList<T extends Item, F extends object>(props: Props<T, F>) {
  const { api, schema, empty, toForm, labels, subtitle, renderForm } = props;
  const t = useChurchWebT();
  const [items, setItems] = useState<readonly T[] | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; form: F } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await authFetch<{ data: T[] }>(api)).data);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  }, [api, t.failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    const parsed = schema.safeParse(editing.form);
    if (!parsed.success) {
      setError(`${t.invalid} (${parsed.error.issues[0]?.path.map(String).join('.') ?? ''})`);
      return;
    }
    setBusy(true);
    try {
      await authFetch(editing.id ? `${api}/${editing.id}` : api, {
        method: editing.id ? 'PUT' : 'POST',
        body: JSON.stringify(parsed.data),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await authFetch(`${api}/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  };

  const openEditor = (id: string | null, form: F) => {
    setError(null);
    setEditing({ id, form });
  };
  const set = (patch: Partial<F>) =>
    setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  return (
    <div className="flex flex-col gap-4">
      <Button className="self-start" onClick={() => openEditor(null, empty())}>
        <Plus className="size-4" />
        {labels.add}
      </Button>
      {!editing && <ErrorBanner message={error} />}

      {items === null ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.none}</p>
      ) : (
        <Card className="py-2">
          <CardContent className="divide-y px-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{subtitle(item)}</p>
                </div>
                <Badge variant={item.visibility === 'public' ? 'secondary' : 'outline'}>
                  {t.visibilities[item.visibility]}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={labels.edit}
                  onClick={() => openEditor(item.id, toForm(item))}
                >
                  <Pencil className="size-4" />
                </Button>
                <DeleteButton name={item.title} onConfirm={() => void remove(item.id)} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? labels.edit : labels.add}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-3">
              {renderForm(editing.form, set)}
              <ErrorBanner message={error} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t.cancel}
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
