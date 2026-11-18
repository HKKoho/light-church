'use client';

import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useT, type Messages } from '@/lib/i18n';
import { STUDIO_PATH, useIsStudioEditor } from './shared';

const messages = {
  en: {
    name: 'Sunday School Studio',
    desc: 'Prepare lessons with AI: describe your class, approve a syllabus, then get passage notes, a timed lesson plan and a review for each week.',
  },
  'zh-TW': {
    name: '主日學備課室',
    desc: '用 AI 備課：描述班級、審批大綱，然後為每週取得經文研習、定時教案及審閱。',
  },
} satisfies Messages<{ name: string; desc: string }>;

/** Editors' way into the Studio from the Sunday School page. */
export function StudioEntry() {
  const t = useT(messages);
  if (!useIsStudioEditor()) return null;
  return (
    <Card className="group relative max-w-xl gap-2 py-4 transition-colors hover:border-foreground/40 hover:bg-accent/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-muted-foreground" />
          <Link
            href={STUDIO_PATH}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
          >
            {t.name}
          </Link>
          <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardTitle>
        <CardDescription className="text-xs">{t.desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}
