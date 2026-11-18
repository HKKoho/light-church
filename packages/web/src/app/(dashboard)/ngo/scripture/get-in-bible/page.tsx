'use client';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useT, type Messages } from '@/lib/i18n';

/** Self-hosted `getinbible` service from docker-compose.prod.yml. */
const GET_IN_BIBLE_URL = process.env['NEXT_PUBLIC_GETINBIBLE_URL'] ?? 'http://localhost:3005';

const messages = {
  en: {
    back: 'Scripture & Learning',
    title: 'Get in Bible',
    subtitle: 'Bible reading programme',
    openNewTab: 'Open in new tab',
  },
  'zh-TW': {
    back: '聖經與學習',
    title: '進入聖經',
    subtitle: '讀經獎勵計劃',
    openNewTab: '在新分頁開啟',
  },
} satisfies Messages<{
  back: string;
  title: string;
  subtitle: string;
  openNewTab: string;
}>;

export default function GetInBiblePage() {
  const t = useT(messages);

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 p-6">
      <header className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground" asChild>
          <Link href="/ngo/scripture">
            <ArrowLeft className="mr-1 size-4" />
            {t.back}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground/70">
              {t.subtitle}
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={GET_IN_BIBLE_URL} target="_blank" rel="noopener noreferrer">
              {t.openNewTab}
              <ExternalLink className="ml-1 size-3.5" />
            </a>
          </Button>
        </div>
      </header>

      {/* External site: scripts + its own origin so its login works; no top navigation. */}
      <iframe
        title={t.title}
        src={GET_IN_BIBLE_URL}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        className="min-h-[75vh] w-full flex-1 rounded-md border bg-white"
      />
    </div>
  );
}
