'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Bot,
  CalendarClock,
  ChevronRight,
  ChevronsUpDown,
  Coins,
  CreditCard,
  FileCheck,
  FolderOpen,
  Gamepad2,
  HandHeart,
  Handshake,
  Heart,
  HeartHandshake,
  Megaphone,
  Languages,
  MapPin,
  MonitorPlay,
  LogOut,
  MessageSquare,
  Moon,
  Newspaper,
  Radio,
  ScrollText,
  Settings2,
  ShieldAlert,
  Sun,
  Target,
  User,
  Users,
  UsersRound,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import anime from 'animejs';
import { EASING } from '@/lib/anime';
import { useLanguage, useT, type Messages } from '@/lib/i18n';
import { useGovernanceModel } from '@/hooks/use-governance-model';
import { Phase2RoadmapCard } from '@/components/dashboard/phase2-roadmap-card';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface NavItem {
  readonly key: string;
  readonly href: string;
  readonly icon: typeof BookOpen;
  readonly adminOnly?: boolean;
}

const platformItems: readonly NavItem[] = [
  { key: 'conversations', icon: MessageSquare, href: '/conversations' },
  { key: 'workspace', icon: FolderOpen, href: '/workspace' },
  { key: 'projector', icon: MonitorPlay, href: '/projector' },
  { key: 'gameStudio', icon: Gamepad2, href: '/game-studio' },
  { key: 'skills', icon: Wrench, href: '/skills' },
  { key: 'agents', icon: Bot, href: '/agents' },
  { key: 'tasks', icon: CalendarClock, href: '/tasks' },
];

export const ngoItems: readonly NavItem[] = [
  { key: 'programs', href: '/ngo/programs', icon: Target },
  { key: 'partners', href: '/ngo/partners', icon: Handshake },
  { key: 'donors', href: '/ngo/donors', icon: Heart },
  { key: 'mne', href: '/ngo/mne', icon: BarChart3 },
  { key: 'comms', href: '/ngo/comms', icon: Newspaper },
  { key: 'fieldOps', href: '/ngo/field-ops', icon: MapPin },
  { key: 'incidents', href: '/ngo/incidents', icon: ShieldAlert },
  { key: 'prayer', href: '/ngo/prayer', icon: HandHeart },
  { key: 'finance', href: '/ngo/finance', icon: Wallet },
  { key: 'outreach', href: '/ngo/outreach', icon: Megaphone },
  { key: 'scripture', href: '/ngo/scripture', icon: BookMarked },
  { key: 'consent', href: '/ngo/consent', icon: FileCheck },
  { key: 'pastoralCare', href: '/ngo/pastoral-care', icon: HeartHandshake },
];

// Pillar-anchored items (community care, mission, discipleship/Bible) — pulled
// out of `ngoItems` and promoted into a persistent sidebar group only when the
// church runs a decentralized (cell-group) governance model, since a lay group
// leader needs one-click daily access rather than the header ministries dropdown.
const CARE_ITEM_KEYS = ['prayer', 'pastoralCare', 'scripture', 'outreach'] as const;
const ngoItemsByKey = new Map(ngoItems.map((item) => [item.key, item]));
const careItems: readonly NavItem[] = CARE_ITEM_KEYS.map((key) => ngoItemsByKey.get(key)).filter(
  (item): item is NavItem => item !== undefined,
);

const governanceItems: readonly NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: BookOpen },
  { key: 'tokenUsage', href: '/governance/tokens', icon: Coins },
  { key: 'auditLogs', href: '/governance/audit', icon: ScrollText },
];

const settingsItems: readonly NavItem[] = [
  { key: 'users', href: '/settings/users', icon: Users },
  { key: 'policies', href: '/settings/policies', icon: CreditCard },
  { key: 'channels', href: '/settings/channels', icon: Radio },
  { key: 'providers', href: '/settings/providers', icon: Bot },
  { key: 'congregationProfile', href: '/settings/congregation-profile', icon: UsersRound },
];

const messages = {
  en: {
    brandTagline: 'Gospel Mission AI',
    groupWorkspace: 'Work with Agents',
    groupCare: 'Care & Discipleship',
    groupGovernance: 'Governance',
    nav: {
      conversations: 'Conversations',
      workspace: 'Workspace',
      projector: 'Projector',
      gameStudio: 'Game Studio',
      skills: 'Skills',
      agents: 'Agents',
      tasks: 'Scheduled Tasks',
      programs: 'Ministries',
      partners: 'Partners',
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
      settings: 'Settings',
      users: 'Users',
      policies: 'Policies',
      channels: 'Channels',
      providers: 'Providers',
      congregationProfile: 'Congregation Profile',
    },
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    toggleTheme: 'Toggle theme',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
    language: 'Language',
    switchLanguage: 'Switch language',
    profile: 'Profile',
    logout: 'Log out',
    userFallback: 'User',
  },
  'zh-TW': {
    brandTagline: '福音宣教 AI',
    groupWorkspace: '與代理協作',
    groupCare: '關懷與門徒訓練',
    groupGovernance: '治理',
    nav: {
      conversations: '對話',
      workspace: '工作區',
      projector: '投影台',
      gameStudio: '遊戲工坊',
      skills: '技能',
      agents: '代理',
      tasks: '排程任務',
      programs: '事工計畫',
      partners: '夥伴機構',
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
      dashboard: '儀表板',
      tokenUsage: 'Token 用量',
      auditLogs: '稽核日誌',
      settings: '設定',
      users: '使用者',
      policies: '政策',
      channels: '頻道',
      providers: '供應商',
      congregationProfile: '會眾背景設定',
    },
    lightMode: '淺色模式',
    darkMode: '深色模式',
    toggleTheme: '切換主題',
    switchToLight: '切換至淺色模式',
    switchToDark: '切換至深色模式',
    language: '語言',
    switchLanguage: '切換語言',
    profile: '個人資料',
    logout: '登出',
    userFallback: '使用者',
  },
} satisfies Messages<{
  brandTagline: string;
  groupWorkspace: string;
  groupCare: string;
  groupGovernance: string;
  nav: Record<string, string>;
  lightMode: string;
  darkMode: string;
  toggleTheme: string;
  switchToLight: string;
  switchToDark: string;
  language: string;
  switchLanguage: string;
  profile: string;
  logout: string;
  userFallback: string;
}>;

// 2px left stripe on hover/active — matches the lift-and-stripe vocabulary used
// across Memory, Groups, and Skills cards.
const navButtonClass =
  'transition-[transform,background-color,box-shadow] duration-150 hover:translate-x-0.5 hover:shadow-[inset_2px_0_0_0_hsl(var(--sidebar-primary)/0.6)] data-[active=true]:shadow-[inset_2px_0_0_0_hsl(var(--sidebar-primary))]';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { lang, toggleLang } = useLanguage();
  const t = useT(messages);
  const { governanceModel } = useGovernanceModel();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const animateSubItems = useCallback((container: HTMLElement) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = container.querySelectorAll('[data-sidebar="menu-sub-item"]');
    items.forEach((el) => {
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(8px)';
    });
    anime({
      targets: items,
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 300,
      delay: anime.stagger(50),
      easing: EASING,
    });
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/40 group-data-[collapsible=icon]:hidden">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/conversations">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Grace Mission</span>
                  <span className="truncate text-xs">{t.brandTagline}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {t.groupWorkspace}
          </SidebarGroupLabel>
          <SidebarMenu>
            {platformItems.map((item) => (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  tooltip={t.nav[item.key as keyof typeof t.nav]}
                  className={navButtonClass}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{t.nav[item.key as keyof typeof t.nav]}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {governanceModel === 'decentralized' && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              {t.groupCare}
            </SidebarGroupLabel>
            <SidebarMenu>
              {careItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={t.nav[item.key as keyof typeof t.nav]}
                    className={navButtonClass}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{t.nav[item.key as keyof typeof t.nav]}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {t.groupGovernance}
          </SidebarGroupLabel>
          <SidebarMenu>
            {governanceItems
              .filter((item) => !item.adminOnly || user?.role === 'super_admin')
              .map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={t.nav[item.key as keyof typeof t.nav]}
                    className={navButtonClass}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{t.nav[item.key as keyof typeof t.nav]}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            <Collapsible
              defaultOpen={pathname.startsWith('/settings')}
              className="group/collapsible"
              onOpenChange={(open) => {
                if (open) {
                  requestAnimationFrame(() => {
                    const el = document.querySelector(
                      '.group\\/collapsible [data-sidebar="menu-sub"]',
                    );
                    if (el) animateSubItems(el as HTMLElement);
                  });
                }
              }}
            >
              {user?.role === 'super_admin' && (
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/settings')}
                      tooltip={t.nav.settings}
                      className={navButtonClass}
                    >
                      <Settings2 />
                      <span>{t.nav.settings}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {settingsItems.map((item) => (
                        <SidebarMenuSubItem key={item.key}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(item.href)}
                            className="transition-all duration-150 hover:translate-x-0.5"
                          >
                            <Link href={item.href}>
                              <item.icon />
                              <span>{t.nav[item.key as keyof typeof t.nav]}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              )}
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <Phase2RoadmapCard />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label={isDark ? t.switchToLight : t.switchToDark}
              tooltip={isDark ? t.lightMode : t.darkMode}
              onClick={() => {
                setTheme(isDark ? 'light' : 'dark');
              }}
            >
              <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              <span>{mounted ? (isDark ? t.lightMode : t.darkMode) : t.toggleTheme}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label={t.switchLanguage}
              tooltip={t.language}
              onClick={toggleLang}
            >
              <Languages className="size-4" />
              <span>{lang === 'en' ? '中文' : 'English'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {(user?.email[0] ?? 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.email.split('@')[0] ?? t.userFallback}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email ?? 'user@example.com'}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuItem
                  onSelect={() => {
                    router.push('/profile');
                  }}
                >
                  <User className="mr-2 size-4" />
                  {t.profile}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    void logout().then(() => {
                      router.push('/login');
                    });
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  {t.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
