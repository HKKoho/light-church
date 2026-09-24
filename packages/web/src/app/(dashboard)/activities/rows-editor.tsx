'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useActivityT } from './messages';

export const selectClass =
  'h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export type FieldSpec<T> = {
  readonly key: keyof T & string;
  readonly label: string;
  /** Wide fields span the full row. */
  readonly wide?: boolean;
} & (
  | { readonly type: 'text' | 'textarea' | 'date' }
  | { readonly type: 'number' }
  /** A string[] edited as one entry per line. */
  | { readonly type: 'lines' }
  | { readonly type: 'select'; readonly options: readonly { value: string; label: string }[] }
);

interface FieldProps<T> {
  readonly id: string;
  readonly spec: FieldSpec<T>;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
}

export function Field<T>({ id, spec, value, onChange }: FieldProps<T>) {
  const control = (() => {
    switch (spec.type) {
      case 'textarea':
        return (
          <Textarea
            id={id}
            rows={spec.wide ? 6 : 3}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'lines':
        return (
          <Textarea
            id={id}
            rows={4}
            value={((value as string[] | undefined) ?? []).join('\n')}
            onChange={(e) => onChange(e.target.value.split('\n'))}
          />
        );
      case 'number':
        return (
          <Input
            id={id}
            type="number"
            min={1}
            className="w-24"
            value={Number(value ?? 1)}
            onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
          />
        );
      case 'select':
        return (
          <select
            id={id}
            className={selectClass}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          >
            {spec.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <Input
            id={id}
            type={spec.type === 'date' ? 'date' : 'text'}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  })();
  return (
    <div className={`flex flex-col gap-1.5 ${spec.wide ? 'sm:col-span-2' : ''}`}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {spec.label}
      </Label>
      {control}
    </div>
  );
}

interface RowsEditorProps<T> {
  readonly id: string;
  readonly title?: string;
  readonly rows: readonly T[];
  readonly fields: readonly FieldSpec<T>[];
  readonly makeEmpty: () => T;
  readonly summary: (row: T, index: number) => string;
  readonly onChange: (rows: T[]) => void;
  /** Collapse each row to its summary line (for long entries such as songs). */
  readonly collapsible?: boolean;
}

/** Edits a list of records: add, remove, reorder, and edit each field. */
export function RowsEditor<T extends object>({
  id,
  title,
  rows,
  fields,
  makeEmpty,
  summary,
  onChange,
  collapsible = false,
}: RowsEditorProps<T>) {
  const t = useActivityT();
  const update = (i: number, key: keyof T, value: unknown) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const move = (i: number, by: number) => {
    const next = [...rows];
    const [row] = next.splice(i, 1);
    if (row) next.splice(i + by, 0, row);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {title && <h3 className="text-sm font-semibold">{title}</h3>}
      {rows.map((row, i) => {
        const tools = (
          <div className="ml-auto flex shrink-0 gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label={t.moveUp}
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label={t.moveDown}
              disabled={i === rows.length - 1}
              onClick={() => move(i, 1)}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-destructive"
              aria-label={t.remove}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
        const body = (
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((spec) => (
              <Field
                key={spec.key}
                id={`${id}-${i}-${spec.key}`}
                spec={spec}
                value={row[spec.key]}
                onChange={(v) => update(i, spec.key, v)}
              />
            ))}
          </div>
        );
        const label = (
          <span className="truncate text-sm font-medium">{summary(row, i) || '…'}</span>
        );
        return collapsible ? (
          <details key={i} className="rounded-md border p-3 [&[open]>summary]:mb-3">
            <summary className="flex cursor-pointer items-center gap-2">
              {label}
              {tools}
            </summary>
            {body}
          </details>
        ) : (
          <div key={i} className="rounded-md border p-3">
            <div className="mb-2 flex items-center gap-2">
              {label}
              {tools}
            </div>
            {body}
          </div>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => onChange([...rows, makeEmpty()])}
      >
        <Plus className="mr-1.5 size-3.5" />
        {t.add}
      </Button>
    </div>
  );
}
