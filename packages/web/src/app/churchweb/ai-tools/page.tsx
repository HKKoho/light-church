'use client';

import Link from 'next/link';
import { Lightbulb } from 'lucide-react';
import { WISDOM_MEMBER_PATH } from '@clawix/shared';
import { useWisdomSiteT } from '@/components/church-site/wisdom-messages';

/** AI Tools for church members; each tool asks them to sign in. */
export default function SiteAiToolsPage() {
  const t = useWisdomSiteT();
  const tools = [
    {
      href: WISDOM_MEMBER_PATH,
      icon: Lightbulb,
      name: t.wisdomName,
      description: t.wisdomDescription,
    },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.aiToolsTitle}</h1>
        <p className="mt-2 text-muted-foreground">{t.aiToolsIntro}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map(({ href, icon: Icon, name, description }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-2 rounded-lg border p-5 transition hover:border-primary hover:shadow-sm"
          >
            <span className="flex items-center gap-2 font-semibold">
              <Icon className="size-5 text-amber-500" />
              {name}
            </span>
            <span className="text-sm text-muted-foreground">{description}</span>
            <span className="mt-auto text-sm font-medium text-primary">{t.open} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
