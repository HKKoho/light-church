import type { Metadata } from 'next';
import { SiteFooter } from '@/components/church-site/site-footer';
import { SiteHeader } from '@/components/church-site/site-header';
import { getPublicSite } from '@/lib/church-site';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicSite();
  const name = data?.site.churchName || 'Church';
  return {
    title: { default: name, template: `%s | ${name}` },
    description: data?.site.tagline || undefined,
  };
}

/** The church's public website: its imported menu and content plus Light Church pages. */
export default async function ChurchWebLayout({ children }: { children: React.ReactNode }) {
  const data = await getPublicSite();
  const site = data?.site;
  const churchName = site?.churchName || 'Church';

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader churchName={churchName} logoUrl={site?.logoUrl ?? ''} nav={site?.nav ?? []} />
      <main className="flex-1">{children}</main>
      <SiteFooter
        churchName={churchName}
        contact={site?.contact ?? { locations: [], email: '', phone: '' }}
        serviceTimes={site?.serviceTimes ?? []}
      />
    </div>
  );
}
