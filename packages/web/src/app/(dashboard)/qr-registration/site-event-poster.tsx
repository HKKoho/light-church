'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Globe, Loader2 } from 'lucide-react';
import {
  CHURCH_SITE_BASE,
  saveSiteEventSchema,
  type QrRegistrationInput,
  type SaveSiteEventInput,
  type SiteEventInfo,
  type SiteVisibility,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authFetch } from '@/lib/auth';
import { useQrT } from './messages';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Posts the planned event to the Church Website's Events page (or the members area). */
export function SiteEventPoster({
  event,
  pageUrl,
}: {
  event: QrRegistrationInput;
  /** The published QR page, linked from the event's description when there is one. */
  pageUrl: string | null;
}) {
  const t = useQrT();
  const typedDate = event.date.trim();
  const [date, setDate] = useState(ISO_DATE.test(typedDate) ? typedDate : '');
  const [visibility, setVisibility] = useState<Exclude<SiteVisibility, 'hidden'>>('public');
  const [posted, setPosted] = useState<SiteEventInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const description = [event.description.trim(), pageUrl && `[${t.siteEventPageLink}](${pageUrl})`]
    .filter(Boolean)
    .join('\n\n');
  const body: SaveSiteEventInput = {
    title: event.eventName.trim(),
    date,
    time: event.time.trim().slice(0, 40),
    location: event.location.trim().slice(0, 200),
    description,
    registrationUrl: event.registrationUrl.trim(),
    visibility,
  };
  const valid = saveSiteEventSchema.safeParse(body).success;

  const postEvent = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch<{ data: SiteEventInfo }>('/api/v1/church-site/events', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setPosted(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  const target =
    visibility === 'members' ? `${CHURCH_SITE_BASE}/members` : `${CHURCH_SITE_BASE}/events`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-5 text-sky-500" />
          {t.siteEventTitle}
        </CardTitle>
        <CardDescription>{t.siteEventSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-event-date">{t.siteEventDate}</Label>
            <Input
              id="site-event-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPosted(null);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="site-event-visibility">{t.siteEventVisibility}</Label>
            <select
              id="site-event-visibility"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={visibility}
              onChange={(e) => {
                setVisibility(e.target.value as 'public' | 'members');
                setPosted(null);
              }}
            >
              <option value="public">{t.siteEventPublic}</option>
              <option value="members">{t.siteEventMembers}</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!valid || busy || !!posted} onClick={() => void postEvent()}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : posted ? (
              <Check className="size-4" />
            ) : (
              <Globe className="size-4" />
            )}
            {busy ? t.siteEventPosting : posted ? t.siteEventPosted : t.siteEventPost}
          </Button>
          {posted && (
            <Link href={target} target="_blank" className="text-sm text-primary hover:underline">
              {visibility === 'members' ? t.siteEventViewMembers : t.siteEventView} →
            </Link>
          )}
        </div>
        {!valid && !posted && <p className="text-xs text-muted-foreground">{t.siteEventNeeds}</p>}
        <p className="text-xs text-muted-foreground">{t.siteEventNote}</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
