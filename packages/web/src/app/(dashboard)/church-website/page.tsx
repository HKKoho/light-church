'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Globe, Loader2 } from 'lucide-react';
import {
  CHURCH_SITE_BASE,
  SITE_ADMIN_ROLES,
  SITE_EDITOR_ROLES,
  type ChurchSiteInfo,
  type SitePageSummary,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authFetch } from '@/lib/auth';
import { EventsTab, MediaTab } from './content-tabs';
import { ImportTab } from './import-tab';
import { useChurchWebT } from './messages';
import { PagesTab } from './pages-tab';
import { ErrorBanner, errorMessage } from './shared';
import { SiteTab } from './site-tab';
import { WisdomCourseManager } from '../wisdom-in-bible/course-manager';

const ADMIN_TABS: readonly string[] = ['import', 'site', 'pages'];
const EDITOR_TABS: readonly string[] = ['events', 'media', 'wisdom'];

function ChurchWebsiteContent() {
  const t = useChurchWebT();
  const { user } = useAuth();
  const isAdmin = !!user && SITE_ADMIN_ROLES.includes(user.role);
  const isEditor = !!user && SITE_EDITOR_ROLES.includes(user.role);
  // `?tab=` opens a tab directly (e.g. /church-website?tab=wisdom).
  const requested = useSearchParams().get('tab') ?? '';
  const defaultTab =
    EDITOR_TABS.includes(requested) || (isAdmin && ADMIN_TABS.includes(requested))
      ? requested
      : isAdmin
        ? 'import'
        : 'events';
  const [site, setSite] = useState<ChurchSiteInfo | null>(null);
  const [pages, setPages] = useState<readonly SitePageSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<ChurchSiteInfo | null> => {
    try {
      const [s, p] = await Promise.all([
        authFetch<{ data: ChurchSiteInfo }>('/api/v1/church-site'),
        authFetch<{ data: SitePageSummary[] }>('/api/v1/church-site/pages'),
      ]);
      setSite(s.data);
      setPages(p.data);
      setError(null);
      return s.data;
    } catch (err) {
      setError(errorMessage(err, t.failed));
      return null;
    }
  }, [t.failed]);

  useEffect(() => {
    if (isAdmin) void reload();
  }, [isAdmin, reload]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2 font-mono text-[10px] uppercase tracking-wider">
            {t.phase}
          </Badge>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Globe className="size-6 text-indigo-500" />
            {t.title}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {isEditor && (
          <Button variant="outline" asChild>
            <Link href={CHURCH_SITE_BASE} target="_blank">
              <ExternalLink className="size-4" />
              {t.viewSite}
            </Link>
          </Button>
        )}
      </div>

      {!isEditor ? (
        <p className="text-sm text-muted-foreground">{t.noAccess}</p>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="h-auto flex-wrap">
            {isAdmin && (
              <>
                <TabsTrigger value="import">{t.tabs.import}</TabsTrigger>
                <TabsTrigger value="site">{t.tabs.site}</TabsTrigger>
                <TabsTrigger value="pages">{t.tabs.pages}</TabsTrigger>
              </>
            )}
            <TabsTrigger value="events">{t.tabs.events}</TabsTrigger>
            <TabsTrigger value="media">{t.tabs.media}</TabsTrigger>
            <TabsTrigger value="wisdom">{t.tabs.wisdom}</TabsTrigger>
          </TabsList>

          {isAdmin && (
            <>
              <ErrorBanner message={error} />
              {!site ? (
                !error && <Loader2 className="mt-4 size-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <TabsContent value="import" className="mt-4">
                    <ImportTab site={site} pages={pages} onChanged={reload} />
                  </TabsContent>
                  <TabsContent value="site" className="mt-4">
                    {/* Re-mount after an import so the form shows the imported values. */}
                    <SiteTab key={site.importedAt ?? 'none'} site={site} onSaved={setSite} />
                  </TabsContent>
                  <TabsContent value="pages" className="mt-4">
                    <PagesTab pages={pages} onChanged={reload} />
                  </TabsContent>
                </>
              )}
            </>
          )}
          <TabsContent value="events" className="mt-4">
            <EventsTab />
          </TabsContent>
          <TabsContent value="media" className="mt-4">
            <MediaTab />
          </TabsContent>
          <TabsContent value="wisdom" className="mt-4">
            <WisdomCourseManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default function ChurchWebsitePage() {
  return (
    <Suspense fallback={<Loader2 className="m-6 size-6 animate-spin text-muted-foreground" />}>
      <ChurchWebsiteContent />
    </Suspense>
  );
}
