'use client';

import Link from 'next/link';
import { ArrowRight, HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    title: 'Start with one AI tool this week — and give the hours back to your people.',
    openDashboard: 'Open the dashboard',
    seeHowItWorks: 'See the path',
    seePlans: 'See plans',
    contribute: 'Support Light Church',
  },
  'zh-TW': {
    title: '這星期先從一個 AI 工具開始——把時間交還給你所牧養的人。',
    openDashboard: '進入儀表板',
    seeHowItWorks: '了解發展路徑',
    seePlans: '查看方案',
    contribute: '奉獻支持光教會',
  },
} satisfies Messages<{
  title: string;
  openDashboard: string;
  seeHowItWorks: string;
  seePlans: string;
  contribute: string;
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
      <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button size="lg" variant="outline" asChild>
          <Link href="/subscription">{t.seePlans}</Link>
        </Button>
        <Button size="lg" variant="ghost" asChild>
          <Link href="/contribute">
            <HandHeart className="mr-1.5 size-4" />
            {t.contribute}
          </Link>
        </Button>
      </div>
    </section>
  );
}
