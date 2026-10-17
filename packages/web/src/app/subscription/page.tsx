import type { Metadata } from 'next';
import { SiteHeader } from '@/components/landing/site-header';
import { SiteFooter } from '@/components/landing/site-footer';
import { SubscriptionPlans } from '@/components/pricing/subscription-plans';

export const metadata: Metadata = { title: 'Plans · Light Church' };

export default function SubscriptionPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <SubscriptionPlans />
      </main>
      <SiteFooter />
    </div>
  );
}
