import type { Metadata } from 'next';
import { SiteHeader } from '@/components/landing/site-header';
import { SiteFooter } from '@/components/landing/site-footer';
import { ContributionForm } from '@/components/pricing/contribution-form';

export const metadata: Metadata = { title: 'Contribute · Light Church' };

export default function ContributePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <ContributionForm />
      </main>
      <SiteFooter />
    </div>
  );
}
