'use client';

import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    eyebrow: 'A glimpse into the workspace',
    sessions: [
      { title: 'Q2 Ministry Report', agent: 'Ministry Coordinator', status: 'drafted' },
      { title: 'Foundation Stewardship Update', agent: 'Stewardship', status: 'in review' },
      { title: 'Nairobi Mission Field Review', agent: 'Mission Field', status: 'drafted' },
      { title: 'Outreach Budget Variance — Aug', agent: 'Stewardship', status: 'flagged' },
      { title: 'Discipleship Intake — New Believers', agent: 'Kingdom Impact', status: 'drafted' },
    ],
    responseLabel: 'Kingdom Impact Helper Agent · Q2 Ministry Report (draft)',
    responseBody:
      '42 new discipleship groups launched this quarter (see mne/processed/2026-q2.md). Scripture engagement among participants rose from 61% to 78%. Two groups now report being self-sustaining without missionary staff present — early fruit of the multiplication model described in the Q1 proposal (see proposals/foundation-grace-q1.md).',
    responseFooter: 'Awaiting human review before this is sent to the foundation.',
  },
  'zh-TW': {
    eyebrow: '工作區一覽',
    sessions: [
      { title: 'Q2 事工報告', agent: '事工協調員', status: '已草擬' },
      { title: '基金會財務更新', agent: '財務管理', status: '審閱中' },
      { title: '奈洛比宣教工場考察', agent: '宣教工場', status: '已草擬' },
      { title: '外展預算差異 — 8月', agent: '財務管理', status: '已標示' },
      { title: '門徒訓練名冊 — 新信徒', agent: '國度成效', status: '已草擬' },
    ],
    responseLabel: '國度成效小幫手代理 · Q2 事工報告（草稿）',
    responseBody:
      '本季新成立 42 個門徒訓練小組（見 mne/processed/2026-q2.md）。參與者的聖經閱讀比例由 61% 提升至 78%。其中兩組已能在無宣教士常駐的情況下自行運作 — 正是 Q1 提案中倍增模式的初步成果（見 proposals/foundation-grace-q1.md）。',
    responseFooter: '尚待人員審閱，方可發送給基金會。',
  },
} satisfies Messages<{
  eyebrow: string;
  sessions: { title: string; agent: string; status: string }[];
  responseLabel: string;
  responseBody: string;
  responseFooter: string;
}>;

function statusVariant(status: string) {
  if (status === 'flagged' || status === '已標示') return 'destructive' as const;
  if (status === 'in review' || status === '審閱中') return 'outline' as const;
  return 'secondary' as const;
}

export function PreviewSection() {
  const t = useT(messages);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <p className="mb-6 text-center text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
        {t.eyebrow}
      </p>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-2 p-4">
            {t.sessions.map((session) => (
              <div
                key={session.title}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium">{session.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{session.agent}</span>
                  </div>
                </div>
                <Badge variant={statusVariant(session.status)} className="shrink-0 text-xs">
                  {session.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Loader2 className="size-4" />
              {t.responseLabel}
            </div>
            <p className="text-sm leading-relaxed">{t.responseBody}</p>
            <div className="flex items-center gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <CheckCircle2 className="size-4" />
              {t.responseFooter}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
