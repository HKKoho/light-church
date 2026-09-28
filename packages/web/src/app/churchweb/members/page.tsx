'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  FileText,
  Loader2,
  LogIn,
  MapPin,
  Tent,
} from 'lucide-react';
import {
  CHURCH_SITE_BASE,
  COMPANION_MEMBER_PATH,
  type ActivitySummary,
  type MembersChurchSite,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { useCompanionT } from '@/components/church-site/companion/messages';
import { useSiteT } from '@/components/church-site/messages';
import { EventCard, MediaCard } from '@/components/church-site/site-cards';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';

const HERE = `${CHURCH_SITE_BASE}/members`;
const READING_CAMPAIGN_URL = 'https://getinbible.vercel.app/login';

/** The Get in Bible reading campaign: members sign in there to take part. */
function ReadingCampaignCard() {
  const t = useSiteT();
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <BookOpen className="size-5 shrink-0 text-amber-500" />
        {t.readingCampaign}
      </h2>
      <p className="text-sm text-muted-foreground">{t.readingCampaignDescription}</p>
      <a
        href={READING_CAMPAIGN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
      >
        {t.joinCampaign}
        <ExternalLink className="size-3.5" />
      </a>
    </article>
  );
}

/** A Mission/Camp activity listed with the members events, linking to its companion. */
function CompanionCard({ activity }: { activity: ActivitySummary }) {
  const t = useCompanionT();
  const dates = [activity.startDate, activity.endDate].filter(Boolean).join(' – ');
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-emerald-600/40 bg-card p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <Tent className="size-4 shrink-0 text-emerald-600" />
        {activity.title}
      </h3>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {dates && (
          <span className="flex items-center gap-1">
            <CalendarDays className="size-4" />
            {dates}
          </span>
        )}
        {activity.location && (
          <span className="flex items-center gap-1">
            <MapPin className="size-4" />
            {activity.location}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t.companionsIntro}</p>
      <Link
        href={`${COMPANION_MEMBER_PATH}/${activity.id}`}
        className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
      >
        {t.openCompanion} →
      </Link>
    </article>
  );
}

/** Members area: sign in with a church account to see members-only content. */
export default function MembersPage() {
  const t = useSiteT();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<MembersChurchSite | null>(null);
  const [companions, setCompanions] = useState<ActivitySummary[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    authFetch<{ data: MembersChurchSite }>('/api/v1/church-site/members')
      .then((res) => setData(res.data))
      .catch(() => setFailed(true));
    // Mission/Camp companions join the members events; the area still works without them.
    authFetch<{ data: ActivitySummary[] }>('/api/v1/activities')
      .then((res) => setCompanions(res.data))
      .catch(() => setCompanions([]));
  }, [user]);

  const section = (title: string, empty: boolean, children: React.ReactNode) => (
    <section>
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {empty ? <p className="text-sm text-muted-foreground">{t.nothingHere}</p> : children}
    </section>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.membersTitle}</h1>
        <p className="mt-2 text-muted-foreground">{t.membersIntro}</p>
      </div>

      <ReadingCampaignCard />

      {isLoading || (user && !data && !failed) ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : !user ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border p-6">
          <p>{t.signInPrompt}</p>
          <Button asChild>
            <Link href={`/login?redirect=${encodeURIComponent(HERE)}`}>
              <LogIn className="size-4" />
              {t.signIn}
            </Link>
          </Button>
        </div>
      ) : failed || !data ? (
        <p className="text-sm text-destructive">{t.loadFailed}</p>
      ) : (
        <>
          {section(
            t.membersPages,
            data.pages.length === 0,
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.pages.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`${HERE}/${p.slug}`}
                    className="flex items-center gap-2 rounded-lg border px-4 py-3 hover:border-primary hover:text-primary"
                  >
                    <FileText className="size-4 shrink-0" />
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>,
          )}
          {section(
            t.membersEvents,
            data.events.length === 0 && companions.length === 0,
            <div className="flex flex-col gap-4">
              {companions.map((a) => (
                <CompanionCard key={a.id} activity={a} />
              ))}
              {data.events.map((e) => (
                <EventCard key={e.id} event={e} full />
              ))}
            </div>,
          )}
          {section(
            t.membersMedia,
            data.media.length === 0,
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.media.map((m) => (
                <MediaCard key={m.id} item={m} full />
              ))}
            </div>,
          )}
        </>
      )}
    </div>
  );
}
