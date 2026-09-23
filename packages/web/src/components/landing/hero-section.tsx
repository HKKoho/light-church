'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VantaBackground } from '@/components/ui/vanta-background';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    headline: 'Your gospel mission, assisted by a team of helper agents & AI tools',
    subheadline:
      'Light Church takes on the rosters, bulletins, minutes and reports — one small, trusted help at a time — so pastors, deacons and ministry teams can spend their hours where Jesus spent His: with people.',
    openDashboard: 'Open the dashboard',
    seeHowItWorks: 'See the path',
    tags: [
      'less admin',
      'more time with people',
      'start with AI tools',
      'human-approved',
      'self-hosted',
    ],
  },
  'zh-TW': {
    headline: '讓一支小幫手和AI工具協助團隊，令你更投身福音使命。',
    subheadline:
      '光教會替你分擔排班、週刊、會議記錄與報告等行政工作——一步一步、一次一個可信任的幫助——讓牧者、執事與事工團隊把時間用在耶穌所看重的地方：與人同在。',
    openDashboard: '進入儀表板',
    seeHowItWorks: '了解發展路徑',
    tags: ['減輕行政', '多些時間與人同在', '從 AI 工具開始', '人員把關', '自架伺服器'],
  },
} satisfies Messages<{
  headline: string;
  subheadline: string;
  openDashboard: string;
  seeHowItWorks: string;
  tags: string[];
}>;

export function HeroSection() {
  const t = useT(messages);

  return (
    <VantaBackground effect="topology" className="border-b border-border/60">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 py-28 text-center sm:py-36">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t.headline}</h1>
        <p className="max-w-2xl text-lg text-foreground/90">{t.subheadline}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
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

        <div className="flex flex-wrap items-center justify-center gap-2">
          {t.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </VantaBackground>
  );
}
