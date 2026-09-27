'use client';

import { useState } from 'react';
import { Check, RotateCcw, Save, Trash2, X } from 'lucide-react';
import type { VenueApplicationInfo, VenueApplicationStatus } from '@clawix/shared';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { choiceLabel } from '@/components/venue-rental/choice-labels';
import { useLanguage } from '@/lib/i18n';
import { useVenueRentalT } from './messages';

const STATUS_VARIANT: Record<VenueApplicationStatus, 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

interface Props {
  readonly app: VenueApplicationInfo;
  readonly onReview: (status: VenueApplicationStatus, adminNotes: string) => Promise<void>;
  readonly onRemove: () => Promise<void>;
}

export function ApplicationCard({ app, onReview, onRemove }: Props) {
  const t = useVenueRentalT();
  const { lang } = useLanguage();
  const [notes, setNotes] = useState(app.adminNotes ?? '');
  const [busy, setBusy] = useState(false);
  const label = (v: string) => choiceLabel(v, lang);
  const when = (iso: string) => new Date(iso).toLocaleString(lang);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const row = (name: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{name}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="truncate">{app.organization}</span>
          <Badge variant={STATUS_VARIANT[app.status]}>{t.statuses[app.status]}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t.submitted(when(app.createdAt))}
          {app.reviewedAt && ` · ${t.reviewed(app.reviewedByName ?? '—', when(app.reviewedAt))}`}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4">
        {row(
          t.contact,
          <>
            {app.contactPerson} {label(app.contactTitle)} ·{' '}
            <a className="underline" href={`tel:${app.mobile}`}>
              {app.mobile}
            </a>{' '}
            ·{' '}
            <a className="underline" href={`mailto:${app.email}`}>
              {app.email}
            </a>
          </>,
        )}
        {row(
          t.venue,
          `${label(app.venueType)}${app.roomCount ? ` · ${t.rooms(app.roomCount)}` : ''}`,
        )}
        {row(
          t.dates,
          <ul>
            {app.sessions.map((s, i) => (
              <li key={i}>
                {s.date} {s.start}–{s.end}
              </li>
            ))}
          </ul>,
        )}
        {row(
          t.activity,
          `${label(app.activityNature)} · ${label(app.activityMode)}${
            app.activityFee !== null ? ` · ${t.fee(app.activityFee)}` : ''
          }`,
        )}
        {row(t.audience, app.targetAudience.map(label).join('、'))}
        {row(t.attendance, label(app.attendanceRange))}
        {row(t.onSite, `${app.repName} ${label(app.repTitle)}`)}
        {row(t.description, <span className="whitespace-pre-wrap">{app.description}</span>)}

        <Textarea
          rows={2}
          value={notes}
          placeholder={t.notes}
          aria-label={t.notes}
          className="mt-2"
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          {app.status !== 'approved' && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => run(() => onReview('approved', notes))}
            >
              <Check className="size-4" />
              {t.approve}
            </Button>
          )}
          {app.status !== 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => onReview('rejected', notes))}
            >
              <X className="size-4" />
              {t.reject}
            </Button>
          )}
          {app.status !== 'pending' && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => run(() => onReview('pending', notes))}
            >
              <RotateCcw className="size-4" />
              {t.reopen}
            </Button>
          )}
          {notes !== (app.adminNotes ?? '') && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => run(() => onReview(app.status, notes))}
            >
              <Save className="size-4" />
              {t.save}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                className="ml-auto text-muted-foreground hover:text-destructive"
                aria-label={t.remove}
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.removeTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.removeBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void run(onRemove)}>{t.remove}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
