'use client';

import { Bot, ShieldCheck, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ADOPTION_PHASES,
  isOnLanding,
  type AdoptionPhaseId,
  type AdoptionPhaseStatus,
} from '@/components/dashboard/adoption-phases';
import { useT, type Messages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Step {
  readonly phase: string;
  readonly title: string;
  readonly role: string;
  readonly body: string;
}

const messages = {
  en: {
    title: 'Help by help, trust by trust',
    subtitle:
      'Trust is built, not assumed. Light Church starts with small, useful help and grows only as your team is ready — the same way a church comes to trust a new volunteer.',
    status: { live: 'Available', building: 'Building now', planned: 'are you ready more advance AI services' },
    steps: [
      {
        phase: 'Phase 1',
        title: 'AI as a tool',
        role: 'For deacons and volunteers new to AI',
        body: 'Pick a ready-made AI tool — a bulletin writer, a verse finder, a rota helper — and use it. No setup, no agent to brief. Small wins that build confidence.',
      },
      {
        phase: 'Phase 2',
        title: 'AI as a volunteer',
        role: 'For teams who have seen the tools work',
        body: 'Brief a built-in helper agent the way you would a church volunteer: "draft this", "research that", "remind me on Monday". It drafts; a person always sends.',
      },
      {
        phase: 'Phase 3',
        title: 'Delegate, with safeguards',
        role: 'For churches ready to hand over routine ministry work',
        body: 'Delegate defined ministry workflows (3a) — only alongside governance, assurance and clear accountability (3b), and a curated library of Scripture and teaching you trust (3c).',
      },
    ],
  },
  'zh-TW': {
    title: '一步一步的幫助，一步一步的信任',
    subtitle:
      '信任是建立出來的，不是假設出來的。光教會從細小而實用的幫助開始，隨著團隊預備好才逐步擴展——就像教會逐漸信任一位新同工一樣。',
    status: { live: '已推出', building: '建構進行中', planned: '建構中' },
    steps: [
      {
        phase: '第一階段',
        title: 'AI 作為工具',
        role: '適合初次接觸 AI 的執事與義工',
        body: '選一個現成的 AI 工具——週刊撰寫、經文查找、排班助手——即可使用。無需設定、無需交代代理。以小小的成果建立信心。',
      },
      {
        phase: '第二階段',
        title: 'AI 作為同工',
        role: '適合已看見工具成效的團隊',
        body: '像交代教會義工一樣交代內建的小幫手代理：「草擬這個」、「研究那個」、「星期一提醒我」。它負責草擬；發出的永遠是人。',
      },
      {
        phase: '第三階段',
        title: '有保障地委派',
        role: '適合準備交付例行事工的教會',
        body: '委派已界定的事工流程（3a）——同時必須具備治理、保證與清楚的責任歸屬（3b），以及你所信任的聖經與教導資料庫（3c）。',
      },
    ],
  },
} satisfies Messages<{
  title: string;
  subtitle: string;
  status: Record<AdoptionPhaseStatus, string>;
  steps: Step[];
}>;

const ICONS = [Wand2, Bot, ShieldCheck];
// Phase 3's status is its first sub-phase's until 3a ships.
const STEP_PHASES: readonly AdoptionPhaseId[] = ['1', '2', '3a'];

export function HowItWorksSection() {
  const t = useT(messages);
  const visibleSteps = t.steps
    .map((step, i) => ({ step, i, phaseId: STEP_PHASES[i] ?? '1' }))
    .filter(({ phaseId }) => isOnLanding(phaseId));

  return (
    <section id="how-it-works" className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h2>
          <p className="mt-3 text-muted-foreground">{t.subtitle}</p>
        </div>
        <div
          className={cn(
            'mx-auto grid gap-4',
            visibleSteps.length >= 3 ? 'sm:grid-cols-3' : 'max-w-4xl sm:grid-cols-2',
          )}
        >
          {visibleSteps.map(({ step, i, phaseId }) => {
            const Icon = ICONS[i] ?? Wand2;
            const status = ADOPTION_PHASES[phaseId].status;
            return (
              <Card key={step.title}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <Badge variant={status === 'planned' ? 'outline' : 'default'}>
                      {t.status[status]}
                    </Badge>
                  </div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {step.phase}
                  </p>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-xs font-medium text-primary">{step.role}</p>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
