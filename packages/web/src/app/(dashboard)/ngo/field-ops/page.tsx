'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { DirectoryListing, FileEntry } from '@clawix/shared';
import { authFetch } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useT, type Messages } from '@/lib/i18n';
import { FolderColumns, type FolderDef } from '../folder-columns';

const FOLDERS: readonly FolderDef[] = [{ path: '/field-ops', label: 'field-ops' }];

const messages = {
  en: {
    title: 'Mission Field',
    subtitle: 'logistics · risk · safety',
    startConversation: 'Start conversation',
    descBefore: 'Logistics lists and risk register. Managed by the ',
    descAgent: 'Mission Field',
    descAfter: ' agent. Safeguarding incidents are tracked separately.',
  },
  'zh-TW': {
    title: '宣教工場',
    subtitle: '後勤 · 風險 · 安全',
    startConversation: '開始對話',
    descBefore: '後勤清單與風險登記。由',
    descAgent: '宣教工場',
    descAfter: '代理管理。防護事件另於安全防護頁面追蹤。',
  },
} satisfies Messages<{
  title: string;
  subtitle: string;
  startConversation: string;
  descBefore: string;
  descAgent: string;
  descAfter: string;
}>;

export default function FieldOpsPage() {
  const t = useT(messages);
  const [columns, setColumns] = useState<Record<string, readonly FileEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled(
      FOLDERS.map((f) =>
        authFetch<DirectoryListing>(`/api/v1/workspace/files?path=${encodeURIComponent(f.path)}`),
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
        <FolderColumns folders={FOLDERS} columns={columns} />
      )}
    </div>
  );
}
