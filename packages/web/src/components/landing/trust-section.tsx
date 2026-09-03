'use client';

import { CheckCircle2 } from 'lucide-react';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    title: 'Faithful stewardship is the foundation',
    verse:
      '"It is required that those who have been given a trust must prove faithful." — 1 Corinthians 4:2',
    points: [
      {
        title: 'Human sign-off, always',
        body: "Every draft awaits a named human's review before anything is sent, signed, or published — non-negotiable, regardless of deadline pressure.",
      },
      {
        title: 'Every figure traced to source',
        body: 'Numbers come from your workspace files, never from memory. If a figure is missing, the helper agent marks it [FILL] instead of guessing.',
      },
      {
        title: 'Self-hosted data',
        body: "Your congregation's, supporters', and community's data stays on infrastructure you control.",
      },
      {
        title: 'Container isolation',
        body: "Each helper agent runs in its own sandboxed container — no helper agent can read another's workspace without an explicit brief.",
      },
      {
        title: 'Immutable audit log',
        body: 'Every write, every refusal, every action — appended to a log that cannot be edited or erased.',
      },
      {
        title: 'Theological integrity',
        body: "If a funder's terms would require diluting the gospel message, the platform flags it rather than papering over the conflict.",
      },
    ],
  },
  'zh-TW': {
    title: '忠心的管理是根基',
    verse: '「所託付的事，要求他有忠心。」— 哥林多前書 4:2',
    points: [
      {
        title: '人員始終把關',
        body: '在發送、簽署或發布之前，每份草稿皆須經具名人員審閱 — 此原則不因截止期限而妥協。',
      },
      {
        title: '每項數字皆可追溯來源',
        body: '數字皆來自您工作區的檔案，絕非憑空想像。若數據缺漏，小幫手代理會標示 [FILL] 而非臆測。',
      },
      {
        title: '資料自行架設',
        body: '您教會、捐助者與社區的資料，皆留存於您掌控的基礎設施上。',
      },
      {
        title: '容器彼此隔離',
        body: '每個小幫手代理皆在獨立的沙箱容器中執行 — 未經明確交付，小幫手代理彼此無法讀取對方的工作區。',
      },
      {
        title: '不可竄改的稽核記錄',
        body: '每一次寫入、每一次拒絕、每一個動作 — 皆附加於無法編輯或刪除的記錄中。',
      },
      {
        title: '神學的忠實性',
        body: '若資助條件要求淡化福音信息，平台會主動標示衝突，而非悄悄掩蓋。',
      },
    ],
  },
} satisfies Messages<{
  title: string;
  verse: string;
  points: { title: string; body: string }[];
}>;

export function TrustSection() {
  const t = useT(messages);

  return (
    <section id="trust" className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight">{t.title}</h2>
          <p className="mt-2 text-sm italic text-muted-foreground">{t.verse}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.points.map((point) => (
            <div key={point.title} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">{point.title}</h3>
                <p className="text-sm text-muted-foreground">{point.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
