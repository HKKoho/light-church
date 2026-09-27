'use client';

import { Languages } from 'lucide-react';
import type { SiteMediaKind } from '@clawix/shared';
import { useLanguage } from '@/lib/i18n';
import { useSiteT, type SiteLabelKey } from './messages';

/** A translated label inside a server-rendered page. */
export function L({ k }: { k: SiteLabelKey }) {
  return <>{useSiteT()[k]}</>;
}

export function MediaKindLabel({ kind }: { kind: SiteMediaKind }) {
  return <>{useSiteT().kinds[kind]}</>;
}

export function LanguageToggle() {
  const t = useSiteT();
  const { toggleLang } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLang}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Languages className="size-4" />
      {t.language}
    </button>
  );
}
