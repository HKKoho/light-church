'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ExternalLink, Sparkles, Wand2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarMenuAction,
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

const messages = {
  en: {
    aiTools: 'AI Tools',
    toggle: 'Show or hide AI tools',
    builtIn: {
      gameBuilder: 'Game Builder',
      missionCamp: 'Mission/Camp Companion',
      rollCall: 'Roll Call',
    },
  },
  'zh-TW': {
    aiTools: 'AI 工具',
    toggle: '顯示或隱藏 AI 工具',
    builtIn: { gameBuilder: '遊戲工坊', missionCamp: '訪宣/營會指南', rollCall: '點名' },
  },
} satisfies Messages<{
  aiTools: string;
  toggle: string;
  builtIn: Record<BuiltInAiTool['key'], string>;
}>;

/**
 * Phase 1 sidebar entry: "AI Tools" opens the overview page; the chevron
 * expands a dropdown listing every tool (built-in first, then the church's
 * uploaded tools by their display name in the current language).
 */
export function AiToolsNavItem() {
  const t = useT(messages);
  const { lang } = useLanguage();
  const pathname = usePathname();
  const { tools } = useAiTools();

  const items = [
    ...BUILT_IN_AI_TOOLS.map((tool) => ({
      key: tool.key,
      href: tool.href,
      label: t.builtIn[tool.key],
      icon: tool.icon,
    })),
    ...tools.map((tool) => ({
      key: `ai-tool:${tool.name}`,
      href: `/ai-tools/${encodeURIComponent(tool.name)}`,
      label: aiToolLabel(tool, lang),
      icon: tool.kind === 'link' ? ExternalLink : Wand2,
    })),
  ];

  return (
    <Collapsible defaultOpen asChild className="group/ai-tools">
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
        <CollapsibleTrigger asChild>
          <SidebarMenuAction aria-label={t.toggle}>
            <ChevronRight className="transition-transform duration-200 group-data-[state=open]/ai-tools:rotate-90" />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((item) => (
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
