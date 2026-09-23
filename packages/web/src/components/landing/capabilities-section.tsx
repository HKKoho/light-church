'use client';

import { Bot, HandHeart, Languages, Server, Wand2, Workflow } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useT, type Messages } from '@/lib/i18n';
import { isOnLanding, type AdoptionPhaseId } from '@/components/dashboard/adoption-phases';

const messages = {
  en: {
    title: 'Built to serve the church',
    subtitle:
      'For churches and Christian organisations that want less paperwork and more ministry.',
    features: [
      {
        title: 'AI Tools directory',
        body: 'A shelf of ready-made AI tools chosen by your church — each opens with one click, runs in a locked-down sandbox and needs no training.',
      },
      {
        title: 'Helper agents for church work',
        body: 'Built-in helpers for sermon prep, Sunday school, Bible study, worship planning, church admin, communications and stewardship — plus mission and NGO specialists.',
      },
      {
        phase: '3a',
        title: 'Workflow generation',
        body: 'Turn routine ministry work — rotas, event logistics, follow-ups — into clear, reviewable workflows with a named person at every checkpoint.',
      },
      {
        title: 'Prayer requests, captured simply',
        body: 'Anyone can send /prayer from the web, Telegram or WhatsApp. Requests move from new → praying → answered, with no AI in between.',
      },
      {
        title: 'Self-hosted and private',
        body: 'Runs on infrastructure your church controls. Members’ personal details are kept out of AI memory, and nothing leaves your servers.',
      },
      {
        title: 'Bilingual from day one',
        body: 'The whole dashboard works in English and 繁體中文, for congregations that worship in more than one language.',
      },
    ],
  },
  'zh-TW': {
    title: '為服事教會而設',
    subtitle: '為希望少些文書、多些事工的教會與基督教機構而設。',
    features: [
      {
        title: 'AI 工具目錄',
        body: '由教會挑選的一系列現成 AI 工具——一按即開、在受保護的沙箱中執行，無需任何訓練。',
      },
      {
        title: '服事教會的小幫手代理',
        body: '內建講道預備、主日學、查經、崇拜籌劃、教會行政、傳訊與財務管理等小幫手，另有宣教及 NGO 專責代理。',
      },
      {
        phase: '3a',
        title: '工作流程生成',
        body: '把排班、活動統籌、跟進等例行事工，轉化為清楚、可審閱的工作流程，每個檢查點都有具名負責人。',
      },
      {
        title: '簡單收集代禱事項',
        body: '任何人都可透過網頁、Telegram 或 WhatsApp 發送 /prayer。代禱事項由「新」→「代禱中」→「已蒙應允」，全程不經 AI。',
      },
      {
        title: '自行架設，保障私隱',
        body: '在教會自己掌控的基礎設施上運行。會友個人資料不會進入 AI 記憶，資料亦不會離開你的伺服器。',
      },
      {
        title: '一開始就支援雙語',
        body: '整個儀表板支援英文與繁體中文，適合以多於一種語言崇拜的會眾。',
      },
    ],
  },
} satisfies Messages<{
  title: string;
  subtitle: string;
  features: { phase?: AdoptionPhaseId; title: string; body: string }[];
}>;

const ICONS = [Wand2, Bot, Workflow, HandHeart, Server, Languages];

export function CapabilitiesSection() {
  const t = useT(messages);

  return (
    <section id="capabilities" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold tracking-tight">{t.title}</h2>
        <p className="mt-2 text-muted-foreground">{t.subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {t.features.map((feature, i) => {
          if (!isOnLanding(feature.phase)) return null;
          const Icon = ICONS[i] ?? Wand2;
          return (
            <Card key={feature.title}>
              <CardContent className="flex flex-col gap-3 p-5">
                <Icon className="size-5 text-primary" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
