'use client';

import { ArrowLeft, Mic } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage, useT, type Messages } from '@/lib/i18n';
import { SundaySchoolCourses } from './courses';
import { CLASSES_2027, LEADERS } from './curriculum';
import { GuestPathway, MemberCycle } from './pathways';

const QUARTERS = [0, 1, 2, 3] as const;

const messages = {
  en: {
    back: 'Scripture & Literacy',
    title: 'Sunday School',
    subtitle: 'Nurture Ministry · 2027',
    head: 'Head',
    deputy: 'Deputy',
    goalsTitle: 'Goals',
    goals: [
      'Teach the message of each book of the Bible.',
      'Emphasise interaction between teachers and learners.',
      'Live out the truth and build a church community grounded in faith in Christ.',
    ],
    tracksTitle: 'Class types',
    tracks: [
      ['First Reading / Conversation', 'For first-time Sunday School attendees and new believers.'],
      ['Application', 'Focused on applying the Bible to daily life.'],
      ['Spiritual Reading', 'Experiencing Scripture through the text, prayer and other practices.'],
      ['Introduction', 'The Old and New Testaments and the overall message of the Hebrew Bible.'],
      ['Study', 'Understanding the Bible through different interpretive elements and methods.'],
    ],
    seriesTitle: 'Five series',
    series: ['Law', 'Prophets', 'Writings', 'New Testament Epistles', 'Gospels & Acts'],
    seriesNote:
      'A Gospel class can open each quarter as needed, so new believers and guests can join.',
    specialTitle: 'Special classes',
    special: [
      ['Baptism class', 'Held regularly for new believers and guests.'],
      [
        'Membership confession class',
        'Helps newly baptised members understand the confession of Cha Kwo Ling Baptist Church, its heritage of faith, and how to take part actively as members.',
      ],
    ],
    curriculumTitle: '2027 curriculum',
    curriculumNote: '12 lessons per quarter',
    classCol: 'Class',
    quarter: (n: number) => `Q${n}`,
    tbc: 'Topic to be confirmed',
    pathwaysTitle: 'Pathways',
    talksTitle: 'Sunday School Talks',
    talksDesc: 'A quarterly combined training for all classes, held during the Sunday School hour.',
    talkTbc: 'Date, topic and speaker to be confirmed',
    coursesTitle: 'Courses',
  },
  'zh-TW': {
    back: '聖經與識字',
    title: '主日學',
    subtitle: '培育部 · 2027',
    head: '部長',
    deputy: '副部長',
    goalsTitle: '目標',
    goals: [
      '教導聖經各書卷信息；',
      '著重教導者與學習者的互動；',
      '實踐真理，建立以基督信仰為基礎的教會群體。',
    ],
    tracksTitle: '學員對象',
    tracks: [
      ['初讀班／淺談班', '適合初次參加主日學者或初信者。'],
      ['應用班', '偏向著重聖經生活應用。'],
      ['靈閱班', '從經文、禱告及其他方法體驗靈閱聖經。'],
      ['導論班', '認識新舊約、希伯來聖經整體信息。'],
      ['研究班', '認識以不同解讀元素和方法了解聖經信息。'],
    ],
    seriesTitle: '五個系列',
    series: ['律法書', '先知書', '聖卷', '新約書信', '福音書與使徒行傳'],
    seriesNote: '福音班每季可就參加者開設，方便初信及來賓參加。',
    specialTitle: '特設班',
    special: [
      ['浸禮班', '定時開設給初信來賓參加。'],
      [
        '會友認信班',
        '讓受浸加入教會的會友更了解茶果嶺浸信會認信內容、信仰傳承，以及怎樣以會友身份積極參與教會事宜。',
      ],
    ],
    curriculumTitle: '2027 年課程',
    curriculumNote: '每季 12 堂',
    classCol: '班別',
    quarter: (n: number) => `第 ${n} 季`,
    tbc: '課題待定',
    pathwaysTitle: '進程',
    talksTitle: '主日學講座',
    talksDesc: '培育部季度合班培訓，於主日學時段舉行。',
    talkTbc: '日期、題目及講員待定',
    coursesTitle: '課程',
  },
} satisfies Messages<{
  back: string;
  title: string;
  subtitle: string;
  head: string;
  deputy: string;
  goalsTitle: string;
  goals: string[];
  tracksTitle: string;
  tracks: [string, string][];
  seriesTitle: string;
  series: string[];
  seriesNote: string;
  specialTitle: string;
  special: [string, string][];
  curriculumTitle: string;
  curriculumNote: string;
  classCol: string;
  quarter: (n: number) => string;
  tbc: string;
  pathwaysTitle: string;
  talksTitle: string;
  talksDesc: string;
  talkTbc: string;
  coursesTitle: string;
}>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SundaySchoolPage() {
  const t = useT(messages);
  const { lang } = useLanguage();

  return (
    <div className="flex min-w-0 flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground" asChild>
          <Link href="/ngo/scripture">
            <ArrowLeft className="mr-1 size-4" />
            {t.back}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
            {t.subtitle}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t.head}：<span className="font-medium text-foreground">{LEADERS.head}</span>
          <span className="mx-2">·</span>
          {t.deputy}：<span className="font-medium text-foreground">{LEADERS.deputy}</span>
        </p>
      </header>

      <Section title={t.coursesTitle}>
        <SundaySchoolCourses />
      </Section>

      <Section title={t.goalsTitle}>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {t.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ol>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t.tracksTitle}>
          <ul className="space-y-2 text-sm">
            {t.tracks.map(([name, desc]) => (
              <li key={name}>
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground"> — {desc}</span>
              </li>
            ))}
          </ul>
        </Section>
        <div className="flex flex-col gap-6">
          <Section title={t.seriesTitle}>
            <div className="flex flex-wrap gap-2">
              {t.series.map((s) => (
                <span key={s} className="rounded-full border px-3 py-1 text-xs">
                  {s}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t.seriesNote}</p>
          </Section>
          <Section title={t.specialTitle}>
            <ul className="space-y-2 text-sm">
              {t.special.map(([name, desc]) => (
                <li key={name}>
                  <span className="font-medium">{name}</span>
                  <span className="text-muted-foreground"> — {desc}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <Section title={`${t.curriculumTitle} · ${t.curriculumNote}`}>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{t.classCol}</th>
                {QUARTERS.map((q) => (
                  <th key={q} className="px-3 py-2 font-medium">
                    {t.quarter(q + 1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLASSES_2027.map((row) => (
                <tr key={row.name.en} className="border-t align-top">
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{row.name[lang]}</td>
                  {QUARTERS.map((q) => {
                    const lesson = row.quarters[q];
                    return (
                      <td key={q} className="px-3 py-2">
                        {lesson && (
                          <>
                            <div className={lesson.topic ? '' : 'text-muted-foreground italic'}>
                              {lesson.topic?.[lang] ?? t.tbc}
                            </div>
                            <div className="text-xs text-muted-foreground">{lesson.teachers}</div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t.pathwaysTitle}>
        <div className="flex flex-col gap-8">
          <GuestPathway />
          <MemberCycle />
        </div>
      </Section>

      <Section title={t.talksTitle}>
        <p className="text-sm text-muted-foreground">{t.talksDesc}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUARTERS.map((q) => (
            <Card key={q} className="gap-2 py-4">
              <CardHeader className="px-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Mic className="size-4 text-muted-foreground" />
                  {t.quarter(q + 1)}
                </CardTitle>
                <CardDescription className="text-xs italic">{t.talkTbc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}
