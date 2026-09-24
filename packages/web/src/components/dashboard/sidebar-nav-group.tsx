'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ChevronRight, type BookOpen } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { isPhaseConstructed, type AdoptionPhaseId } from './adoption-phases';

// 2px left stripe on hover/active — matches the lift-and-stripe vocabulary used
// across Memory, Groups, and Skills cards.
export const navButtonClass =
  'transition-[transform,background-color,box-shadow] duration-150 hover:translate-x-0.5 hover:shadow-[inset_2px_0_0_0_hsl(var(--sidebar-primary)/0.6)] data-[active=true]:shadow-[inset_2px_0_0_0_hsl(var(--sidebar-primary))]';

export interface SidebarLink {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  readonly icon: typeof BookOpen;
}

interface SidebarNavGroupProps {
  readonly label: string;
  readonly phase?: AdoptionPhaseId;
  readonly toBeConstructedLabel: string;
  readonly links: readonly SidebarLink[];
  readonly isActive: (href: string) => boolean;
  /** Extra menu items rendered after `links` (e.g. the Settings collapsible). */
  readonly children?: ReactNode;
}

export function SidebarNavGroup({
  label,
  phase,
  toBeConstructedLabel,
  links,
  isActive,
  children,
}: SidebarNavGroupProps) {
  const pending = phase !== undefined && !isPhaseConstructed(phase);
  // A pending phase's links stay tucked behind its label button until the user
  // opts in (or is already on one of its pages). Icon-collapsed mode always shows them.
  const [expanded, setExpanded] = useState(() => links.some((item) => isActive(item.href)));
  const hideLinks = pending && links.length > 0 && !expanded;
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {phase && <span className="text-sidebar-primary">P{phase}</span>}
        <span className="truncate">{label}</span>
      </SidebarGroupLabel>
      {pending && (
        <button
          type="button"
          aria-expanded={!hideLinks}
          onClick={() => {
            setExpanded((open) => !open);
          }}
          className="mx-2 mb-1 flex items-center gap-1 rounded-md border border-amber-500/40 px-2 py-1 text-left font-mono text-[10px] tracking-[0.08em] text-amber-600 transition-colors hover:bg-amber-500/10 group-data-[collapsible=icon]:hidden dark:text-amber-400"
        >
          <span className="flex-1">{toBeConstructedLabel}</span>
          <ChevronRight
            className={cn('size-3 shrink-0 transition-transform', !hideLinks && 'rotate-90')}
          />
        </button>
      )}
      <SidebarMenu className={cn(hideLinks && 'hidden group-data-[collapsible=icon]:flex')}>
        {links.map((item) => (
          <SidebarMenuItem key={item.key}>
            <SidebarMenuButton
              asChild
              isActive={isActive(item.href)}
              tooltip={item.label}
              className={navButtonClass}
            >
              <Link href={item.href}>
                <item.icon />
                <span className="truncate">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        {children}
      </SidebarMenu>
    </SidebarGroup>
  );
}
