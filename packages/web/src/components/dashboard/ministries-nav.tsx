'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useT, type Messages } from '@/lib/i18n';
import { useAuth } from '@/components/auth-provider';
import {
  governanceItems,
  ngoItems,
  phase3cItems,
  type NavItem,
} from '@/components/dashboard/app-sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MinistryCategory {
  readonly key: string;
  readonly itemKeys: readonly string[];
  /** Rendered after a divider — e.g. Phase 3b governance items. */
  readonly extraItemKeys?: readonly string[];
  /** Keys shown in this dropdown only to super admins and `restrictedRoles`. */
  readonly restrictedItemKeys?: readonly string[];
  /** Roles besides super_admin that also see `restrictedItemKeys`. */
  readonly restrictedRoles?: readonly string[];
}

const categories: readonly MinistryCategory[] = [
  {
    key: 'bibleMinistries',
    itemKeys: ['comms', 'scripture', 'fieldOps', 'outreach', 'programs'],
    // Phase 3c (Data & Domain Curation) — moved here from the sidebar.
    extraItemKeys: ['curation'],
    restrictedItemKeys: ['fieldOps', 'programs', 'curation'],
  },
  {
    key: 'careGovernance',
    itemKeys: ['mne', 'pastoralCare', 'prayer', 'incidents'],
    restrictedItemKeys: ['mne', 'pastoralCare'],
    restrictedRoles: ['senior_pastor', 'pastor'],
  },
  {
    key: 'financeStewardship',
    itemKeys: ['donors', 'finance', 'consent'],
    // Phase 3b (Governance, Assurance & Liability) — moved here from the sidebar.
    extraItemKeys: ['dashboard', 'tokenUsage', 'auditLogs', 'escalations'],
    restrictedItemKeys: ['donors', 'finance', 'dashboard', 'tokenUsage', 'auditLogs'],
    restrictedRoles: ['senior_pastor', 'pastor', 'deacon'],
  },
];

const itemsByKey = new Map<string, NavItem>(
  [...ngoItems, ...governanceItems, ...phase3cItems].map((item) => [item.key, item]),
);

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
      dashboard: 'Dashboard',
      tokenUsage: 'Token Usage',
      auditLogs: 'Audit Logs',
      escalations: 'Escalation & Override',
      curation: 'Knowledge Curation',
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
      donors: '執事管理',
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
      dashboard: '儀表板',
      tokenUsage: 'Token 用量',
      auditLogs: '稽核日誌',
      escalations: '升級與覆核',
      curation: '知識整理',
    },
  },
} satisfies Messages<{
  category: Record<string, string>;
  nav: Record<string, string>;
}>;

export function MinistriesNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const t = useT(messages);
  const { user } = useAuth();

  const isActive = (href: string) => pathname.startsWith(href);
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <nav className={cn('flex items-center gap-1', className)}>
      {categories.map((category) => {
        const seesRestricted =
          isSuperAdmin || (!!user && !!category.restrictedRoles?.includes(user.role));
        const resolve = (keys: readonly string[]) =>
          keys
            .map((key) => itemsByKey.get(key))
            .filter((item): item is NavItem => item !== undefined)
            .filter(
              (item) =>
                isSuperAdmin ||
                (!item.adminOnly &&
                  (seesRestricted || !category.restrictedItemKeys?.includes(item.key))),
            );
        const items = resolve(category.itemKeys);
        const extraItems = resolve(category.extraItemKeys ?? []);
        const categoryActive = [...items, ...extraItems].some((item) => isActive(item.href));

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
              {extraItems.length > 0 && <DropdownMenuSeparator />}
              {extraItems.map((item) => (
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
