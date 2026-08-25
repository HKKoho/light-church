'use client';

import { useT, type Messages } from '@/lib/i18n';
import { PacksTab } from '../packs-tab';

const messages = {
  en: {
    title: 'Ministry Packs',
    description: 'Install and toggle bundles of specialist worker agents.',
  },
  'zh-TW': {
    title: '事工套件',
    description: '安裝並切換各類專門代理套件。',
  },
} satisfies Messages<{
  title: string;
  description: string;
}>;

export default function PacksPage() {
  const t = useT(messages);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      <PacksTab />
    </div>
  );
}
