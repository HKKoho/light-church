'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useT, type Messages } from '@/lib/i18n';
import { ngoItems, type NavItem } from '@/components/dashboard/app-sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MinistryCategory {
  readonly key: string;
  readonly itemKeys: readonly string[];
}

const categories: readonly MinistryCategory[] = [
  { key: 'bibleMinistries', itemKeys: ['comms', 'scripture', 'fieldOps', 'outreach', 'programs'] },
  { key: 'careGovernance', itemKeys: ['mne', 'pastoralCare', 'prayer', 'incidents'] },
  { key: 'financeStewardship', itemKeys: ['donors', 'finance', 'consent'] },
];

const itemsByKey = new Map<string, NavItem>(ngoItems.map((item) => [item.key, item]));

const messages = {
  en: {
    category: {
      bibleMinistries: 'Bible & Ministries',
      financeStewardship: 'Finance & Stewardship',
      careGovernance: 'Care & Governance',
    },
    nav: {
      programs: 'Other Programs',
      donors: 'Stewardship',
      mne: 'Kingdom Impact',
      comms: 'Proclamation',
      fieldOps: 'Mission Field',
      incidents: 'Safeguarding',
      prayer: 'Prayer Requests',
      finance: 'Finance',
      outreach: 'Outreach',
      scripture: 'Scripture & Literacy',
      consent: 'Consent Records',
      pastoralCare: 'Pastoral Care',
    },
  },
  'zh-TW': {
    category: {
      bibleMinistries: '聖經與事工',
      financeStewardship: '財務治理',
      careGovernance: '牧養與治理',
    },
    nav: {
      programs: '其他事工',
      donors: '財務管理',
      mne: '國度成效',
      comms: '宣揚福音',
      fieldOps: '宣教工場',
      incidents: '安全防護',
      prayer: '代禱事項',
      finance: '財務',
      outreach: '外展佈道',
      scripture: '聖經與識字',
      consent: '同意紀錄',
      pastoralCare: '牧養關懷',
    },
  },
} satisfies Messages<{
  category: Record<string, string>;
  nav: Record<string, string>;
}>;

export function MinistriesNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const t = useT(messages);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className={cn('flex items-center gap-1', className)}>
      {categories.map((category) => {
        const items = category.itemKeys
          .map((key) => itemsByKey.get(key))
          .filter((item): item is NavItem => item !== undefined);
        const categoryActive = items.some((item) => isActive(item.href));

        return (
          <DropdownMenu key={category.key}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-active={categoryActive}
                className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
              >
                {t.category[category.key as keyof typeof t.category]}
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {items.map((item) => (
                <DropdownMenuItem key={item.key} asChild>
                  <Link href={item.href}>
                    <item.icon />
                    {t.nav[item.key as keyof typeof t.nav]}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}
