'use client';

import { BookOpen, ExternalLink, GraduationCap, School, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useT, type Messages } from '@/lib/i18n';

type CardKey = 'getInBible' | 'sundaySchool' | 'theologyPlatform';

/** Outside links open in a new tab; Light Church pages open in place. */
const CARDS: readonly { key: CardKey; icon: LucideIcon; href: string }[] = [
  { key: 'getInBible', icon: BookOpen, href: 'https://getinbible.vercel.app/admin' },
  { key: 'sundaySchool', icon: School, href: '/ngo/scripture/sunday-school' },
  {
    key: 'theologyPlatform',
    icon: GraduationCap,
    href: 'https://ai-christianity-platform.vercel.app/',
  },
];

const messages = {
  en: {
    open: 'Open',
    cards: {
      getInBible: {
        name: 'Get in Bible',
        description:
          'Start reading Scripture — guided entry points for newcomers and new believers.',
      },
      sundaySchool: {
        name: 'Sunday School',
        description:
          'The 2027 class plan, Sunday School talks, and Wisdom in Bible courses to read and understand the Bible regularly.',
      },
      theologyPlatform: {
        name: 'Theology Platform',
        description: 'Deeper study of doctrine and theology for leaders and teachers.',
      },
    },
  },
  'zh-TW': {
    open: '開啟',
    cards: {
      getInBible: {
        name: '進入聖經',
        description: '開始閱讀聖經——為慕道者及初信者預備的入門引導。',
      },
      sundaySchool: {
        name: '主日學',
        description: '2027 年班別計劃、主日學講座，以及定期閱讀及明白聖經的「聖經中的智慧」課程。',
      },
      theologyPlatform: {
        name: '神學平台',
        description: '為領袖及教師預備的教義與神學深入研讀。',
      },
    },
  },
} satisfies Messages<{
  open: string;
  cards: Record<CardKey, { name: string; description: string }>;
}>;

export function ScriptureCards() {
  const t = useT(messages);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS.map(({ key, icon: Icon, href }) => (
        <Card key={key} className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Icon className="size-4 text-muted-foreground" />
              {t.cards[key].name}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-xs">
              {t.cards[key].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <Button size="sm" variant="outline" asChild>
              {href.startsWith('/') ? (
                <Link href={href}>{t.open}</Link>
              ) : (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {t.open}
                  <ExternalLink className="ml-1 size-3.5" />
                </a>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
