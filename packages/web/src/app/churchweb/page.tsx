import Link from 'next/link';
import { Building2, CalendarDays, PlayCircle, Users } from 'lucide-react';
import { CHURCH_SITE_BASE } from '@clawix/shared';
import { EventCard, MediaCard } from '@/components/church-site/site-cards';
import { L } from '@/components/church-site/site-label';
import { SiteMarkdown } from '@/components/church-site/site-markdown';
import { getPublicEvents, getPublicMedia, getPublicPage, getPublicSite } from '@/lib/church-site';
import type { SiteLabelKey } from '@/components/church-site/messages';

const QUICK_LINKS: { k: SiteLabelKey; href: string; icon: typeof Users }[] = [
  { k: 'events', href: `${CHURCH_SITE_BASE}/events`, icon: CalendarDays },
  { k: 'media', href: `${CHURCH_SITE_BASE}/media`, icon: PlayCircle },
  { k: 'rent', href: `${CHURCH_SITE_BASE}/rent`, icon: Building2 },
  { k: 'members', href: `${CHURCH_SITE_BASE}/members`, icon: Users },
];

function SectionHeading({ k, href }: { k: SiteLabelKey; href: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl font-semibold">
        <L k={k} />
      </h2>
      <Link href={href} className="text-sm text-primary hover:underline">
        <L k="seeAll" />
      </Link>
    </div>
  );
}

export default async function ChurchHomePage() {
  const [data, home, events, media] = await Promise.all([
    getPublicSite(),
    getPublicPage('home'),
    getPublicEvents(),
    getPublicMedia(),
  ]);
  const site = data?.site;

  if (!site?.churchName && !home) {
    return (
      <p className="mx-auto max-w-6xl px-4 py-24 text-center text-muted-foreground">
        <L k="notSetUp" />
      </p>
    );
  }

  return (
    <>
      <section className="border-b bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{site?.churchName}</h1>
          {site?.tagline && (
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{site.tagline}</p>
          )}
          {site && site.serviceTimes.length > 0 && (
            <div className="mt-6 inline-flex flex-col gap-1 rounded-lg border bg-background/80 px-4 py-3 text-sm">
              <span className="font-medium">
                <L k="serviceTimes" />
              </span>
              {site.serviceTimes.map((s) => (
                <span key={s.label + s.time} className="text-muted-foreground">
                  {s.label}：{s.time}
                </span>
              ))}
            </div>
          )}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_LINKS.map(({ k, href, icon: Icon }) => (
              <Link
                key={k}
                href={href}
                className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm font-medium hover:border-primary hover:text-primary"
              >
                <Icon className="size-5 shrink-0" />
                <L k={k} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10">
        {home?.markdown && <SiteMarkdown markdown={home.markdown} />}

        <section>
          <SectionHeading k="upcomingEvents" href={`${CHURCH_SITE_BASE}/events`} />
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <L k="noEvents" />
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {events.slice(0, 3).map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeading k="latestMedia" href={`${CHURCH_SITE_BASE}/media`} />
          {media.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <L k="noMedia" />
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {media.slice(0, 3).map((m) => (
                <MediaCard key={m.id} item={m} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
