'use client';

import { Gamepad2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    title: 'Game Studio',
    subtitle: 'storyboard · approve · build',
    description:
      'Build short, Scripture-rooted narrative games for VBS and youth ministry through a storyboard-first, human-approved pipeline. Spawn the game-studio agent from a conversation — it drafts a storyboard for your review, and only builds after you approve it. Finished games play on the Projector page.',
    step1: 'Ask for a game',
    step1Body:
      'In a conversation, describe the passage, audience, and length — or use the built-in "Game Builder" suggestion.',
    step2: 'Review the storyboard',
    step2Body:
      'The agent drafts a scene-by-scene storyboard first. Nothing gets built until you approve it.',
    step3: 'Play it on Projector',
    step3Body:
      'Once approved, the agent builds the game and it appears on your Projector page, ready to play.',
    cta: 'Start a conversation',
  },
  'zh-TW': {
    title: '遊戲工坊',
    subtitle: '故事板 · 核准 · 製作',
    description:
      '透過故事板優先、經人核准的流程，為暑期聖經班與青少年事工製作短篇聖經主題敘事遊戲。在對話中啟動 game-studio 代理——它會先產出故事板供您審閱，核准後才開始製作。完成的遊戲會顯示在投影台頁面上供遊玩。',
    step1: '提出遊戲需求',
    step1Body: '在對話中描述經文段落、對象與長度——或直接使用內建的「遊戲工坊」建議。',
    step2: '審閱故事板',
    step2Body: '代理會先產出逐場景的故事板。在您核准之前不會開始製作。',
    step3: '於投影台遊玩',
    step3Body: '核准後，代理會製作遊戲，完成後會顯示在投影台頁面上，即可遊玩。',
    cta: '開始對話',
  },
} satisfies Messages<{
  title: string;
  subtitle: string;
  description: string;
  step1: string;
  step1Body: string;
  step2: string;
  step2Body: string;
  step3: string;
  step3Body: string;
  cta: string;
}>;

export default function GameStudioPage() {
  const t = useT(messages);
  const steps = [
    { label: t.step1, body: t.step1Body },
    { label: t.step2, body: t.step2Body },
    { label: t.step3, body: t.step3Body },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <header className="flex flex-col gap-1 border-b border-border/60 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
              {t.subtitle}
            </span>
          </div>
          <Button asChild>
            <Link href="/conversations">
              <MessageSquare className="mr-2 size-4" />
              {t.cta}
            </Link>
          </Button>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{t.description}</p>
      </header>

      <div className="mx-auto grid w-full max-w-3xl gap-4 py-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-4"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-foreground/20 bg-muted font-mono text-xs">
                {i + 1}
              </span>
              <Gamepad2 className="size-4 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-medium">{step.label}</h2>
            <p className="text-xs text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
