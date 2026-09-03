'use client';

import { FileSearch, BookOpen, Server, ShieldCheck, MessageCircle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    title: 'Built for the mission field',
    subtitle: 'Everything a gospel-centred ministry needs to run lean and stay faithful.',
    features: [
      {
        title: 'Five ministry specialist helper agents',
        body: 'Ministry Coordinator, Stewardship, Kingdom Impact, Proclamation, and Mission Field helper agents, each scoped to its own workspace folders and refusal patterns.',
      },
      {
        title: 'Document intake & OCR',
        body: 'Drop in scanned receipts, supporter letters, or field notes — helper agents extract and file them automatically.',
      },
      {
        title: 'Learns your conventions',
        body: "Helper agents pick up your organisation's templates, terminology, and reporting style over time.",
      },
      {
        title: 'Self-hosted Docker infrastructure',
        body: 'Every helper agent runs in its own isolated container on infrastructure you control — no data leaves your servers.',
      },
      {
        title: 'Role-based access & audit logging',
        body: 'Fine-grained permissions and an append-only audit log of every action taken.',
      },
      {
        title: 'Multi-channel delivery',
        body: 'Reach your team and partners over the web dashboard, Telegram, or WhatsApp.',
      },
    ],
  },
  'zh-TW': {
    title: '為宣教工場打造',
    subtitle: '一個以福音為中心的事工，精簡運作、忠心管理所需的一切。',
    features: [
      {
        title: '五位事工專屬小幫手代理',
        body: '事工協調員、財務管理、國度成效、宣揚福音與宣教工場小幫手代理，各自僅限存取自己的工作區資料夾與拒絕準則。',
      },
      {
        title: '文件擷取與 OCR',
        body: '上傳收據、捐助者信件或現場筆記的掃描檔 — 小幫手代理會自動擷取並歸檔。',
      },
      {
        title: '學習您的慣例',
        body: '小幫手代理會逐漸熟悉您機構的範本、用語與報告風格。',
      },
      {
        title: '自架 Docker 基礎設施',
        body: '每個小幫手代理皆於您掌控的基礎設施上以獨立容器執行 — 資料不會外流。',
      },
      {
        title: '角色權限與稽核記錄',
        body: '細緻的權限控管，以及每個操作皆留下的唯讀稽核記錄。',
      },
      {
        title: '多管道傳遞',
        body: '透過網頁儀表板、Telegram 或 WhatsApp 與您的團隊及夥伴聯繫。',
      },
    ],
  },
} satisfies Messages<{
  title: string;
  subtitle: string;
  features: { title: string; body: string }[];
}>;

const ICONS = [Users, FileSearch, BookOpen, Server, ShieldCheck, MessageCircle];

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
          const Icon = ICONS[i] ?? Users;
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
