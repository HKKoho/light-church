'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    title: 'Ready to put your first helper agent to work for the mission?',
    openDashboard: 'Open the dashboard',
    seeHowItWorks: 'See how it works',
  },
  'zh-TW': {
    title: '準備好讓第一位小幫手代理為使命效力了嗎？',
    openDashboard: '進入儀表板',
    seeHowItWorks: '了解運作方式',
  },
} satisfies Messages<{
  title: string;
  openDashboard: string;
  seeHowItWorks: string;
}>;

export function CtaSection() {
  const t = useT(messages);

  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h2>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button size="lg" asChild>
          <Link href="/login">
            {t.openDashboard}
            <ArrowRight className="ml-1.5 size-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href="#how-it-works">{t.seeHowItWorks}</a>
        </Button>
      </div>
    </section>
  );
}
