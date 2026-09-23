'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import type { AiToolDetail } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/auth';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    back: 'All AI Tools',
    loadError: (name: string) => `Failed to load "${name}"`,
    openExternal: 'Open in a new tab',
    externalHint:
      'This tool is hosted outside Light Church. Do not paste member personal data into it.',
  },
  'zh-TW': {
    back: '所有 AI 工具',
    loadError: (name: string) => `無法載入「${name}」`,
    openExternal: '在新分頁開啟',
    externalHint: '此工具由 Light Church 以外的服務提供，請勿貼上會友個人資料。',
  },
} satisfies Messages<{
  back: string;
  loadError: (name: string) => string;
  openExternal: string;
  externalHint: string;
}>;

export default function AiToolViewerPage() {
  const t = useT(messages);
  const { name: rawName } = useParams<{ name: string }>();
  const name = decodeURIComponent(rawName);
  const [tool, setTool] = useState<AiToolDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTool(null);
    setError(false);
    authFetch<{ success: boolean; data: AiToolDetail }>(
      `/api/v1/ai-tools/${encodeURIComponent(name)}`,
    )
      .then((res) => {
        if (!cancelled) setTool(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/ai-tools">
            <ArrowLeft className="mr-1 size-4" />
            {t.back}
          </Link>
        </Button>
        <h1 className="truncate text-lg font-semibold">{name}</h1>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t.loadError(name)}
        </div>
      ) : !tool ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : tool.kind === 'link' && tool.url ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">{tool.name}</CardTitle>
            {tool.description && <CardDescription>{tool.description}</CardDescription>}
            <CardDescription className="text-amber-600 dark:text-amber-400">
              {t.externalHint}
            </CardDescription>
            <Button asChild className="mt-2 w-fit">
              <a href={tool.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 size-4" />
                {t.openExternal}
              </a>
            </Button>
          </CardHeader>
        </Card>
      ) : (
        // No allow-same-origin: uploaded tool HTML runs in an opaque origin and
        // can't reach the dashboard's cookies, storage or authenticated API.
        <iframe
          srcDoc={tool.html ?? ''}
          sandbox="allow-scripts allow-forms allow-modals allow-downloads allow-popups"
          className="w-full flex-1 rounded-lg border bg-background"
          title={tool.name}
        />
      )}
    </div>
  );
}
