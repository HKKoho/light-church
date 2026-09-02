'use client';

import { MessageSquare, Split, HeartHandshake } from 'lucide-react';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    title: 'How it works',
    steps: [
      {
        title: 'Ask',
        body: 'Describe what your ministry needs in plain language — a supporter letter, a field report, a discipleship indicator.',
      },
      {
        title: 'Dispatch & Draft',
        body: 'Specialist agents work in parallel inside isolated containers, drafting from your actual workspace files — never inventing numbers.',
      },
      {
        title: 'Discern & Act',
        body: 'Nothing is sent, signed, or published until a human reviews it in prayerful discernment.',
      },
    ],
  },
  'zh-TW': {
    title: '運作方式',
    steps: [
      {
        title: '詢問',
        body: '用平實話語描述事工所需 — 一封捐助者信件、一份現場報告，或一項門徒訓練指標。',
      },
      {
        title: '派遣與草擬',
        body: '專屬代理在隔離的容器中平行作業，根據您工作區的實際檔案草擬內容 — 絕不捏造數字。',
      },
      {
        title: '辨明與行動',
        body: '在人員以禱告辨明並審閱之前，任何內容皆不會發送、簽署或發布。',
      },
    ],
  },
} satisfies Messages<{
  title: string;
  steps: { title: string; body: string }[];
}>;

const ICONS = [MessageSquare, Split, HeartHandshake];

export function HowItWorksSection() {
  const t = useT(messages);

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="mb-10 text-center text-2xl font-bold tracking-tight">{t.title}</h2>
      <div className="grid gap-8 sm:grid-cols-3">
        {t.steps.map((step, i) => {
          const Icon = ICONS[i] ?? MessageSquare;
          return (
            <div key={step.title} className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
