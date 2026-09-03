'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VantaBackground } from '@/components/ui/vanta-background';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    headline: 'Your gospel mission, carried by a team of helper agents.',
    subheadline:
      "Tell your ministry's specialist helper agents what's needed in plain English. They draft stewardship letters, discipleship reports, and Kingdom Impact data — self-hosted, source-traced, and always reviewed by a human before anything is sent.",
    openDashboard: 'Open the dashboard',
    seeHowItWorks: 'See how it works',
    tags: [
      'ministry reports',
      'stewardship updates',
      'Kingdom Impact tracking',
      'discipleship data',
      'self-hosted',
    ],
  },
  'zh-TW': {
    headline: '讓一支小幫手代理團隊，承擔你的福音使命。',
    subheadline:
      '用平實的語言告訴事工的專屬小幫手代理你需要什麼。他們會草擬財務報告、門徒訓練報告與國度成效資料 — 全部自架伺服器、可追溯來源，且在發出前永遠經過人員審閱。',
    openDashboard: '進入儀表板',
    seeHowItWorks: '了解運作方式',
    tags: ['事工報告', '財務管理更新', '國度成效追蹤', '門徒訓練資料', '自架伺服器'],
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
