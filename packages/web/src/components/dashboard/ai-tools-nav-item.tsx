'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AiToolSummary } from '@clawix/shared';
import {
  ChevronRight,
  Church,
  ExternalLink,
  FolderCog,
  Sparkles,
  Users,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { aiToolLabel, useAiTools } from '@/hooks/use-ai-tools';
import { useLanguage, useT, type Messages } from '@/lib/i18n';
import { BUILT_IN_AI_TOOLS, type BuiltInAiTool } from './built-in-ai-tools';
import { navButtonClass } from './sidebar-nav-group';

// Old uploaded tools in `<data>/AITools/` superseded by a built-in page
// (/roll-call, /activities), so they never get their own sidebar entry.
const HIDDEN_UPLOADED_TOOLS: ReadonlySet<string> = new Set(['roll-call', 'mission-camp-companion']);

const messages = {
  en: {
    aiTools: 'AI Tools',
    toggle: 'Show or hide AI tools',
    groups: {
      mainAdmin: 'Main Church Admin',
      otherAdmin: 'Other Church Admin',
      customerAdmin: 'Customer Admin',
    },
    builtIn: {
      gameBuilder: 'Game Builder',
      missionCamp: 'Mission/Camp Companion',
      rollCall: 'Roll Call',
      aiSurvey: 'AI Survey',
      qrRegistration: 'Event Planning',
      venueRental: 'Rent Church Place',
      churchWebsite: 'Church Website',
    },
  },
  'zh-TW': {
    aiTools: 'AI 工具',
    toggle: '顯示或隱藏 AI 工具',
    groups: {
      mainAdmin: '教會主要行政',
      otherAdmin: '其他教會行政',
      customerAdmin: '會友服務',
    },
    builtIn: {
      gameBuilder: '遊戲工坊',
      missionCamp: '訪宣/營會指南',
      rollCall: '點名',
      aiSurvey: 'AI 問卷',
      qrRegistration: '活動策劃',
      venueRental: '租借教會場地',
      churchWebsite: '教會網站',
    },
  },
} satisfies Messages<{
  aiTools: string;
  toggle: string;
  groups: Record<NavGroup['key'], string>;
  builtIn: Record<BuiltInAiTool['key'], string>;
}>;

type NavEntry = { readonly builtIn: BuiltInAiTool['key'] } | { readonly uploaded: string };

interface NavGroup {
  readonly key: 'mainAdmin' | 'otherAdmin' | 'customerAdmin';
  readonly icon: LucideIcon;
  readonly entries: readonly NavEntry[];
  /** Uploaded tools not placed in any group are appended to this one. */
  readonly catchAll?: true;
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    key: 'mainAdmin',
    icon: Church,
    entries: [
      { uploaded: 'sunday-service-bulletin' },
      { builtIn: 'churchWebsite' },
      { builtIn: 'missionCamp' },
      { uploaded: 'finance-pipeline' },
    ],
  },
  {
    key: 'otherAdmin',
    icon: FolderCog,
    entries: [{ builtIn: 'rollCall' }, { builtIn: 'qrRegistration' }, { builtIn: 'aiSurvey' }],
    catchAll: true,
  },
  {
    key: 'customerAdmin',
    icon: Users,
    entries: [{ builtIn: 'gameBuilder' }, { builtIn: 'venueRental' }],
  },
];

const GROUPED_UPLOADED: ReadonlySet<string> = new Set(
  NAV_GROUPS.flatMap((group) =>
    group.entries.flatMap((entry) => ('uploaded' in entry ? [entry.uploaded] : [])),
  ),
);

interface NavLink {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

/**
 * Phase 1 sidebar entries: "AI Tools" opens the overview page, followed by
 * three collapsible groups (Main Church Admin, Other Church Admin, Customer
 * Admin) mixing built-in pages and church-uploaded tools.
 */
export function AiToolsNavItem() {
  const t = useT(messages);
  const { lang } = useLanguage();
  const pathname = usePathname();
  const { tools } = useAiTools();

  const visible = tools.filter((tool) => !HIDDEN_UPLOADED_TOOLS.has(tool.name));
  const toUploadedLink = (tool: AiToolSummary): NavLink => ({
    key: `ai-tool:${tool.name}`,
    href: `/ai-tools/${encodeURIComponent(tool.name)}`,
    label: aiToolLabel(tool, lang),
    icon: tool.kind === 'link' ? ExternalLink : Wand2,
  });
  const toLinks = (group: NavGroup): NavLink[] => {
    const links = group.entries.flatMap((entry): NavLink[] => {
      if ('builtIn' in entry) {
        const tool = BUILT_IN_AI_TOOLS.find((item) => item.key === entry.builtIn);
        return tool
          ? [{ key: tool.key, href: tool.href, label: t.builtIn[tool.key], icon: tool.icon }]
          : [];
      }
      const tool = visible.find((item) => item.name === entry.uploaded);
      return tool ? [toUploadedLink(tool)] : [];
    });
    if (group.catchAll) {
      links.push(...visible.filter((tool) => !GROUPED_UPLOADED.has(tool.name)).map(toUploadedLink));
    }
    return links;
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === '/ai-tools'}
          tooltip={t.aiTools}
          className={navButtonClass}
        >
          <Link href="/ai-tools">
            <Sparkles />
            <span>{t.aiTools}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {NAV_GROUPS.map((group) => (
        <AiToolsNavGroup
          key={group.key}
          label={t.groups[group.key]}
          toggleLabel={t.toggle}
          icon={group.icon}
          links={toLinks(group)}
          pathname={pathname}
        />
      ))}
    </>
  );
}

function AiToolsNavGroup({
  label,
  toggleLabel,
  icon: Icon,
  links,
  pathname,
}: {
  readonly label: string;
  readonly toggleLabel: string;
  readonly icon: LucideIcon;
  readonly links: readonly NavLink[];
  readonly pathname: string;
}) {
  return (
    <Collapsible defaultOpen asChild className="group/ai-tools">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={label} className={navButtonClass}>
            <Icon />
            <span>{label}</span>
            <ChevronRight
              aria-label={toggleLabel}
              className="ml-auto transition-transform duration-200 group-data-[state=open]/ai-tools:rotate-90"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {links.map((item) => (
              <SidebarMenuSubItem key={item.key}>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  className="transition-all duration-150 hover:translate-x-0.5"
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
