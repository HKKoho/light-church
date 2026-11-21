'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { DirectoryListing, FileEntry } from '@clawix/shared';
import { authFetch } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useT, type Messages } from '@/lib/i18n';
import { FolderColumns, type FolderDef } from '../folder-columns';
import { ScriptureCards } from './scripture-cards';

const FOLDERS: readonly FolderDef[] = [
  { path: '/scripture/bible-recitation', label: 'bible-recitation' },
  { path: '/scripture/sunday-school-course', label: 'sunday-school-course' },
  { path: '/scripture/topical-studies', label: 'topical-studies' },
];

const messages = {
  en: {
    title: 'Scripture & Learning',
    subtitle: 'recitation · courses · studies',
    startConversation: 'Start conversation',
    descBefore:
      'Bible recitation plans, Sunday School courses, and topical Bible studies. Managed by the ',
    descAgent: 'Scripture & Learning',
    descAfter: ' agent.',
    folderTitles: {
      'bible-recitation': 'Bible Recitation',
      'sunday-school-course': 'Sunday School Course',
      'topical-studies': 'Topical Studies',
    },
  },
  'zh-TW': {
    title: '聖經與學習',
    subtitle: '背誦 · 課程 · 專題',
    startConversation: '開始對話',
    descBefore: '聖經背誦計畫、主日學課程，以及專題查經。由',
    descAgent: '聖經與學習',
    descAfter: '代理管理。',
    folderTitles: {
      'bible-recitation': '聖經背誦',
      'sunday-school-course': '主日學課程',
      'topical-studies': '專題研究',
    },
  },
} satisfies Messages<{
  title: string;
  subtitle: string;
  startConversation: string;
  descBefore: string;
  descAgent: string;
  descAfter: string;
  folderTitles: Record<string, string>;
}>;

export default function ScripturePage() {
  const t = useT(messages);
  const folders = useMemo(() => {
    const titles: Record<string, string> = t.folderTitles;
    return FOLDERS.map((f) => ({ ...f, title: titles[f.label] ?? f.label }));
  }, [t]);
  const [columns, setColumns] = useState<Record<string, readonly FileEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled(
      FOLDERS.map((f) =>
        authFetch<DirectoryListing>(
          `/api/v1/workspace/files?path=${encodeURIComponent(f.path)}&missing=empty`,
        ),
      ),
    );
    const next: Record<string, readonly FileEntry[]> = {};
    FOLDERS.forEach(({ label }, i) => {
      const r = results[i];
      if (r) next[label] = r.status === 'fulfilled' ? r.value.entries : [];
    });
    setColumns(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <header className="flex flex-col gap-1 border-b border-border/60 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
              {t.subtitle}
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/conversations">
              <MessageSquare className="mr-2 size-4" />
              {t.startConversation}
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {t.descBefore}
          <span className="font-medium text-foreground">{t.descAgent}</span>
          {t.descAfter}
        </p>
      </header>

      <ScriptureCards />

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <FolderColumns folders={folders} columns={columns} />
      )}
    </div>
  );
}
