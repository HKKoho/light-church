'use client';

import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { MAX_VENUE_SESSIONS, type VenueSession } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRentT } from './messages';

export const emptySession = (): VenueSession => ({ date: '', start: '09:00', end: '12:00' });

export function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="size-3" />
      {message}
    </p>
  );
}

interface Props {
  readonly sessions: readonly VenueSession[];
  readonly errors: Readonly<Record<string, string>>;
  readonly onChange: (sessions: VenueSession[]) => void;
}

/** One to three dates, each with a start and end time. */
export function SessionFields({ sessions, errors, onChange }: Props) {
  const t = useRentT();
  const today = new Date().toISOString().slice(0, 10);
  const update = (i: number, patch: Partial<VenueSession>) =>
    onChange(sessions.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div className="flex flex-col gap-3">
      <Label>
        {t.sessions} <span className="text-destructive">*</span>
      </Label>
      {sessions.map((s, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <div className="col-span-3 sm:col-span-1">
            <span className="text-xs text-muted-foreground">{t.date(i + 1)}</span>
            <Input
              type="date"
              min={today}
              value={s.date}
              aria-label={t.date(i + 1)}
              aria-invalid={!!errors[`sessions.${i}.date`]}
              onChange={(e) => update(i, { date: e.target.value })}
            />
            <FieldError message={errors[`sessions.${i}.date`]} />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t.start}</span>
            <Input
              type="time"
              value={s.start}
              aria-label={t.start}
              onChange={(e) => update(i, { start: e.target.value })}
            />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t.end}</span>
            <Input
              type="time"
              value={s.end}
              aria-label={t.end}
              aria-invalid={!!errors[`sessions.${i}.end`]}
              onChange={(e) => update(i, { end: e.target.value })}
            />
            <FieldError message={errors[`sessions.${i}.end`]} />
          </div>
          <div className="pt-4">
            {sessions.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t.removeDate}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange(sessions.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
      {sessions.length < MAX_VENUE_SESSIONS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...sessions, emptySession()])}
        >
          <Plus className="size-4" />
          {t.addDate}
        </Button>
      )}
    </div>
  );
}
