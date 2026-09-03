'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { DirectoryListing, FileEntry } from '@clawix/shared';
import { authFetch } from '@/lib/auth';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { useT, type Messages } from '@/lib/i18n';
import { FolderColumns, type FolderDef } from '../folder-columns';

const BASE_FOLDERS: readonly FolderDef[] = [
  { path: '/incidents/triage', label: 'triage' },
  { path: '/incidents/records', label: 'records' },
];

const ADMIN_FOLDER: FolderDef = { path: '/incidents/keys', label: 'keys' };

const messages = {
  en: {
    title: 'Safeguarding',
    subtitle: 'triage · records · protection',
    startConversation: 'Start conversation',
    descBefore:
      'Post-triage documentation only — a human triages every incident first. Managed by the ',
    descAgent: 'Mission Field',
    descAfter: ' agent.',
  },
  'zh-TW': {
    title: '安全防護',
    subtitle: '分流 · 記錄 · 保護',
    startConversation: '開始對話',
    descBefore: '僅限分流後建立記錄 — 每起事件須由人員先行分流。由',
    descAgent: '宣教工場',
    descAfter: '代理管理。',
  },
} satisfies Messages<{
  title: string;
  subtitle: string;
  startConversation: string;
  descBefore: string;
  descAgent: string;
  descAfter: string;
}>;

export default function IncidentsPage() {
  const t = useT(messages);
  const { user } = useAuth();
  const folders = useMemo<readonly FolderDef[]>(
    () => (user?.role === 'admin' ? [...BASE_FOLDERS, ADMIN_FOLDER] : BASE_FOLDERS),
    [user?.role],
  );
  const [columns, setColumns] = useState<Record<string, readonly FileEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled(
      folders.map((f) =>
        authFetch<DirectoryListing>(`/api/v1/workspace/files?path=${encodeURIComponent(f.path)}`),
      ),
    );
    const next: Record<string, readonly FileEntry[]> = {};
    folders.forEach(({ label }, i) => {
      const r = results[i];
      if (r) next[label] = r.status === 'fulfilled' ? r.value.entries : [];
    });
    setColumns(next);
    setLoading(false);
  }, [folders]);

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
        <FolderColumns folders={folders} columns={columns} />
      )}
    </div>
  );
}
