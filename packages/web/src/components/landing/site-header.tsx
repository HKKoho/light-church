'use client';

import Link from 'next/link';
import { GalleryVerticalEnd, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage, useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    brand: 'Light Church',
    howItWorks: 'How it works',
    capabilities: 'Capabilities',
    trust: 'Faithfulness',
    signIn: 'Sign in',
    switchLanguage: 'Switch language',
  },
  'zh-TW': {
    brand: '光教會',
    howItWorks: '運作方式',
    capabilities: '功能',
    trust: '忠心管理',
    signIn: '登入',
    switchLanguage: '切換語言',
  },
} satisfies Messages<{
  brand: string;
  howItWorks: string;
  capabilities: string;
  trust: string;
  signIn: string;
  switchLanguage: string;
}>;

export function SiteHeader() {
  const { lang, toggleLang } = useLanguage();
  const t = useT(messages);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          <span className="text-sm font-semibold">{t.brand}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#how-it-works" className="hover:text-foreground">
            {t.howItWorks}
          </a>
          <a href="#capabilities" className="hover:text-foreground">
            {t.capabilities}
          </a>
          <a href="#trust" className="hover:text-foreground">
            {t.trust}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t.switchLanguage}
            onClick={toggleLang}
            className="gap-1.5 text-muted-foreground"
          >
            <Languages className="size-4" />
            {lang === 'en' ? '中文' : 'English'}
          </Button>
          <Button size="sm" asChild>
            <Link href="/login">{t.signIn}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
