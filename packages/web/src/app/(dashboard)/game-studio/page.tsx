'use client';

import { ExternalLink, Gamepad2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { AiToolBriefButton } from '@/components/dashboard/ai-tool-brief-button';
import { Button } from '@/components/ui/button';
import { VISUAL4STORY_URL } from '@/lib/external-tools';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    title: 'Game Studio',
    subtitle: 'storyboard · approve · build',
    description:
      'Build short, Scripture-rooted narrative games for VBS and youth ministry through a storyboard-first, human-approved pipeline. Spawn the game-studio agent from a conversation — it drafts a storyboard for your review, and only builds after you approve it. Finished games play right in your Workspace.',
    step1: 'Ask for a game',
    step1Body:
      'In a conversation, describe the passage, audience, and length — or use the built-in "Game Builder" suggestion.',
    step2: 'Review the storyboard',
    step2Body:
      'The agent drafts a scene-by-scene storyboard first. Nothing gets built until you approve it.',
    step3: 'Play it in Workspace',
    step3Body:
      'Once approved, the agent builds the game. It appears in your Workspace under projector/, marked Projector — click it to play.',
    cta: 'Start a conversation',
    visual: 'Visual4Story',
    visualHint:
      'Build characters, scenes and storyboard visuals in Visual4Story (opens in a new tab)',
  },
  'zh-TW': {
    title: '遊戲工坊',
    subtitle: '故事板 · 核准 · 製作',
    description:
      '透過故事板優先、經人核准的流程，為暑期聖經班與青少年事工製作短篇聖經主題敘事遊戲。在對話中啟動 game-studio 代理——它會先產出故事板供您審閱，核准後才開始製作。完成的遊戲可直接在工作區中遊玩。',
    step1: '提出遊戲需求',
    step1Body: '在對話中描述經文段落、對象與長度——或直接使用內建的「遊戲工坊」建議。',
    step2: '審閱故事板',
    step2Body: '代理會先產出逐場景的故事板。在您核准之前不會開始製作。',
    step3: '於工作區遊玩',
    step3Body:
      '核准後，代理會製作遊戲，完成後會出現在工作區的 projector/ 資料夾中並標示為「投影」——點擊即可遊玩。',
    cta: '開始對話',
    visual: 'Visual4Story',
    visualHint: '在 Visual4Story 製作角色、場景及故事板圖像（在新分頁開啟）',
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
  visual: string;
  visualHint: string;
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
          <div className="flex flex-wrap gap-2">
            <AiToolBriefButton briefKey="gameBuilder" toolName={t.title} />
            <Button variant="outline" asChild title={t.visualHint}>
              <a href={VISUAL4STORY_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 size-4" />
                {t.visual}
              </a>
            </Button>
            <Button asChild>
              <Link href="/conversations">
                <MessageSquare className="mr-2 size-4" />
                {t.cta}
              </Link>
            </Button>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{t.description}</p>
        <img
          src="/images/site/animals.jpg"
          alt=""
          className="mt-3 h-32 w-full rounded-lg object-cover sm:h-40"
        />
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
