'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { CHURCH_SITE_BASE, type SiteNavItem } from '@clawix/shared';
import { cn } from '@/lib/utils';
import { useSiteT } from './messages';
import { LanguageToggle } from './site-label';

interface Props {
  readonly churchName: string;
  readonly logoUrl: string;
  readonly nav: readonly SiteNavItem[];
}

const isExternal = (href: string) => /^https?:\/\//i.test(href);

function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return isExternal(href) ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** The church's imported menu plus Light Church's own pages. */
export function SiteHeader({ churchName, logoUrl, nav }: Props) {
  const t = useSiteT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const extras: SiteNavItem[] = [
    { label: t.events, href: `${CHURCH_SITE_BASE}/events`, children: [] },
    { label: t.media, href: `${CHURCH_SITE_BASE}/media`, children: [] },
    { label: t.rent, href: `${CHURCH_SITE_BASE}/rent`, children: [] },
    { label: t.aiTools, href: `${CHURCH_SITE_BASE}/ai-tools`, children: [] },
    { label: t.members, href: `${CHURCH_SITE_BASE}/members`, children: [] },
  ];
  const home = nav.length ? [] : [{ label: t.home, href: CHURCH_SITE_BASE, children: [] }];
  const items = [...home, ...nav, ...extras];
  const active = (href: string) =>
    href === CHURCH_SITE_BASE ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href={CHURCH_SITE_BASE} className="flex min-w-0 items-center gap-2 font-semibold">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={churchName}
              className="h-10 w-auto max-w-[220px] rounded-md bg-white object-contain p-1"
            />
          ) : (
            <span className="truncate">{churchName}</span>
          )}
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label={t.menu}>
          {items.map((item) => (
            <div key={item.href + item.label} className="group relative">
              <NavLink
                href={item.href}
                className={cn(
                  'flex items-center gap-1 rounded-md px-3 py-2 text-sm hover:bg-muted',
                  active(item.href) && 'font-semibold text-primary',
                )}
              >
                {item.label}
                {item.children.length > 0 && <ChevronDown className="size-3" />}
              </NavLink>
              {item.children.length > 0 && (
                <div className="invisible absolute left-0 top-full z-50 min-w-52 rounded-md border bg-popover p-1 opacity-0 shadow-md transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.href + child.label}
                      href={child.href}
                      className="block rounded-sm px-3 py-2 text-sm hover:bg-muted"
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <LanguageToggle />
          <button
            type="button"
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            aria-label={t.menu}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t px-4 py-2 lg:hidden" aria-label={t.menu}>
          {items.map((item) => (
            <div key={item.href + item.label} className="py-1">
              <NavLink
                href={item.href}
                className="block rounded-md px-2 py-2 font-medium hover:bg-muted"
              >
                {item.label}
              </NavLink>
              {item.children.map((child) => (
                <NavLink
                  key={child.href + child.label}
                  href={child.href}
                  className="block rounded-md py-1.5 pl-6 pr-2 text-sm text-muted-foreground hover:bg-muted"
                >
                  {child.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}
