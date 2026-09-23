'use client';

import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    copyright: '© 2026 AIbyML.com SG Ltd',
    tagline: 'AI that carries the admin, so your church can be with its people',
    verse: '"Go therefore and make disciples of all nations." — Matthew 28:19',
  },
  'zh-TW': {
    copyright: '© 2026 AIbyML.com SG Ltd',
    tagline: '由 AI 分擔行政，讓教會能與人同在',
    verse: '「所以，你們要去，使萬民作我的門徒。」— 馬太福音 28:19',
  },
} satisfies Messages<{
  copyright: string;
  tagline: string;
  verse: string;
}>;

export function SiteFooter() {
  const t = useT(messages);

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
        <p>{t.tagline}</p>
        <p className="italic">{t.verse}</p>
        <p className="text-xs">{t.copyright}</p>
      </div>
    </footer>
  );
}
