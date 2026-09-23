'use client';

import { ClipboardList, HandHeart, UsersRound } from 'lucide-react';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    eyebrow: 'Why Light Church',
    title: 'Less administration. More time with people.',
    intro:
      'Jesus did not come to be served, but to serve — He ate with people, listened, touched and prayed with them. Yet many church and ministry leaders now spend their week on spreadsheets, rosters and reports. Light Church gives those hours back.',
    verse:
      '"It would not be right for us to neglect the ministry of the word of God in order to wait on tables … [we] will give our attention to prayer and the ministry of the word." — Acts 6:2, 4',
    points: [
      {
        title: 'AI carries the paperwork',
        body: 'Bulletins, volunteer rotas, meeting minutes, supporter reports and follow-up lists are drafted for you — the "waiting on tables" that quietly fills a leader\'s week.',
      },
      {
        title: 'You carry the people',
        body: 'The time saved goes where AI cannot: hospital visits, a coffee with a new believer, a phone call to someone who has stopped coming, a prayer at the door.',
      },
      {
        title: 'Care stays human',
        body: 'Pastoral care, discernment and decisions about people are never handed to a machine. AI prepares; a person listens, prays and decides.',
      },
    ],
  },
  'zh-TW': {
    eyebrow: '為何選擇光教會',
    title: '少些行政，多些與人同在。',
    intro:
      '耶穌來不是要受人的服事，乃是要服事人——祂與人同席、聆聽、觸摸他們，並為他們禱告。然而今天許多教會與事工領袖，一週的時間都花在試算表、排班與報告上。光教會把這些時間交還給你。',
    verse:
      '「我們撇下神的道去管理飯食，原是不合宜的……但我們要專心以祈禱傳道為事。」— 使徒行傳 6:2、4',
    points: [
      {
        title: 'AI 承擔文書工作',
        body: '週刊、同工排班、會議記錄、支持者報告與跟進名單，都先為你草擬好——就是那些悄悄佔滿領袖一週的「管理飯食」。',
      },
      {
        title: '你承擔的是人',
        body: '省下的時間，用在 AI 做不到的地方：探訪病人、陪新信徒喝杯咖啡、致電久未返教會的肢體、在門口為人禱告。',
      },
      {
        title: '關懷始終由人來做',
        body: '牧養關懷、屬靈辨明與關乎人的決定，永遠不交給機器。AI 負責預備；由人聆聽、禱告並作決定。',
      },
    ],
  },
} satisfies Messages<{
  eyebrow: string;
  title: string;
  intro: string;
  verse: string;
  points: { title: string; body: string }[];
}>;

const ICONS = [ClipboardList, UsersRound, HandHeart];

export function WhySection() {
  const t = useT(messages);

  return (
    <section id="why" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
          {t.eyebrow}
        </p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h2>
        <p className="mt-4 text-muted-foreground">{t.intro}</p>
        <p className="mt-4 text-sm italic text-muted-foreground">{t.verse}</p>
      </div>
      <div className="grid gap-8 sm:grid-cols-3">
        {t.points.map((point, i) => {
          const Icon = ICONS[i] ?? ClipboardList;
          return (
            <div key={point.title} className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold">{point.title}</h3>
              <p className="text-sm text-muted-foreground">{point.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
