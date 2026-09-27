'use client';

import Link from 'next/link';
import { BookOpen, ExternalLink, Landmark, Lightbulb, type LucideIcon } from 'lucide-react';
import { WISDOM_MEMBER_PATH } from '@clawix/shared';
import { useWisdomSiteT } from '@/components/church-site/wisdom-messages';

interface Tool {
  href: string;
  icon: LucideIcon;
  name: string;
  description: string;
  external?: boolean;
}

const cardClass =
  'flex flex-col gap-2 rounded-lg border p-5 transition hover:border-primary hover:shadow-sm';

/** AI Tools for church members: church tools ask them to sign in; external ones open in a new tab. */
export default function SiteAiToolsPage() {
  const t = useWisdomSiteT();
  const tools: readonly Tool[] = [
    {
      href: WISDOM_MEMBER_PATH,
      icon: Lightbulb,
      name: t.wisdomName,
      description: t.wisdomDescription,
    },
    {
      href: 'https://getinbible.vercel.app/login',
      icon: BookOpen,
      name: t.getInBibleName,
      description: t.getInBibleDescription,
      external: true,
    },
    {
      href: 'https://christianplatform.vercel.app/',
      icon: Landmark,
      name: t.cultureName,
      description: t.cultureDescription,
      external: true,
    },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.aiToolsTitle}</h1>
        <p className="mt-2 text-muted-foreground">{t.aiToolsIntro}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map(({ href, icon: Icon, name, description, external }) => {
          const body = (
            <>
              <span className="flex items-center gap-2 font-semibold">
                <Icon className="size-5 text-amber-500" />
                {name}
              </span>
              <span className="text-sm text-muted-foreground">{description}</span>
              <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                {t.open}
                {external ? <ExternalLink className="size-3.5" /> : ' →'}
              </span>
            </>
          );
          return external ? (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cardClass}
            >
              {body}
            </a>
          ) : (
            <Link key={href} href={href} className={cardClass}>
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
