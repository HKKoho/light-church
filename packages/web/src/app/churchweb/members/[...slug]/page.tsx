'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CHURCH_SITE_BASE, type SitePageDetail } from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { useSiteT } from '@/components/church-site/messages';
import { SiteMarkdown } from '@/components/church-site/site-markdown';
import { authFetch } from '@/lib/auth';
import { slugFromParams } from '@/lib/site-slug';

/** A members-only page; signed-out visitors are sent back to the members area. */
export default function MembersContentPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const slug = slugFromParams(use(params).slug);
  const t = useSiteT();
  const { user, isLoading } = useAuth();
  const [page, setPage] = useState<SitePageDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    authFetch<{ data: SitePageDetail }>(
      `/api/v1/church-site/members/page?slug=${encodeURIComponent(slug)}`,
    )
      .then((res) => setPage(res.data))
      .catch(() => setFailed(true));
  }, [user, slug]);

  const back = (
    <Link
      href={`${CHURCH_SITE_BASE}/members`}
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      <ArrowLeft className="size-4" />
      {t.back}
    </Link>
  );

  if (!isLoading && !user) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-10">
        {back}
        <p>{t.signInPrompt}</p>
      </div>
    );
  }

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      {back}
      {failed ? (
        <p className="text-sm text-destructive">{t.loadFailed}</p>
      ) : !page ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <>
          <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
          <SiteMarkdown markdown={page.markdown} />
        </>
      )}
    </article>
  );
}
