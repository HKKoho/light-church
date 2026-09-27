'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2, LogIn } from 'lucide-react';
import { CHURCH_SITE_BASE, type MembersChurchSite } from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { useSiteT } from '@/components/church-site/messages';
import { EventCard, MediaCard } from '@/components/church-site/site-cards';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';

const HERE = `${CHURCH_SITE_BASE}/members`;

/** Members area: sign in with a church account to see members-only content. */
export default function MembersPage() {
  const t = useSiteT();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<MembersChurchSite | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    authFetch<{ data: MembersChurchSite }>('/api/v1/church-site/members')
      .then((res) => setData(res.data))
      .catch(() => setFailed(true));
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
            data.events.length === 0,
            <div className="flex flex-col gap-4">
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
