'use client';

import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    eyebrow: 'A glimpse into a week with Light Church',
    sessions: [
      { title: 'Sunday Bulletin — 5 Oct', agent: 'AI Tool · Bulletin Writer', status: 'drafted' },
      { title: 'October Volunteer Rota', agent: 'Church Admin helper', status: 'in review' },
      { title: 'Deacons’ Meeting Minutes', agent: 'Church Admin helper', status: 'drafted' },
      { title: 'Newcomer Follow-up List', agent: 'Ministry Coordinator', status: 'needs a person' },
      { title: 'Prayer List for Wednesday', agent: 'AI Tool · Prayer List', status: 'drafted' },
    ],
    responseLabel: 'Church Admin Helper Agent · October Volunteer Rota (draft)',
    responseBody:
      'Rota drafted for 3 Sunday services and 2 midweek meetings from volunteers/availability.md. Two slots are still open and marked [FILL] — no one has been assigned without asking. Last month this rota took about 3 hours by hand; those hours are now free for the Thursday hospital visits on your calendar.',
    responseFooter: 'Awaiting a deacon’s review before anything is sent to volunteers.',
  },
  'zh-TW': {
    eyebrow: '與光教會同行的一週',
    sessions: [
      { title: '主日週刊 — 10月5日', agent: 'AI 工具 · 週刊撰寫', status: '已草擬' },
      { title: '十月同工排班表', agent: '教會行政小幫手', status: '審閱中' },
      { title: '執事會會議記錄', agent: '教會行政小幫手', status: '已草擬' },
      { title: '新朋友跟進名單', agent: '事工協調員', status: '需要人跟進' },
      { title: '週三禱告會代禱事項', agent: 'AI 工具 · 代禱清單', status: '已草擬' },
    ],
    responseLabel: '教會行政小幫手代理 · 十月同工排班表（草稿）',
    responseBody:
      '已根據 volunteers/availability.md 為三堂主日崇拜及兩個週間聚會草擬排班。尚有兩個崗位未填，已標示 [FILL]——未經詢問不會替任何人排班。上月這份排班人手處理約需三小時；這些時間現在可以留給你行事曆上週四的醫院探訪。',
    responseFooter: '尚待執事審閱，方可發送給同工。',
  },
} satisfies Messages<{
  eyebrow: string;
  sessions: { title: string; agent: string; status: string }[];
  responseLabel: string;
  responseBody: string;
  responseFooter: string;
}>;

function statusVariant(status: string) {
  // A hand-off to a person is the goal, not an error — highlight it, don't alarm.
  if (status === 'needs a person' || status === '需要人跟進') return 'default' as const;
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
