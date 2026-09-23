'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import type { AiToolDetail } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/auth';
import {
  TOOL_FETCH_RESULT,
  buildToolSrcDoc,
  isToolFetchRequest,
  isToolStorageMessage,
  type ToolFetchResult,
} from '@/lib/ai-tool-storage-bridge';
import { handleToolServerRequest, type ToolServerNotice } from '@/lib/ai-tool-server-routes';
import { useLanguage, useT, type Messages } from '@/lib/i18n';
import { aiToolDescription, aiToolLabel } from '@/hooks/use-ai-tools';

const messages = {
  en: {
    back: 'AI Tools',
    loadError: (name: string) => `Failed to load "${name}"`,
    openExternal: 'Open in a new tab',
    externalHint:
      'This tool is hosted outside Light Church. Do not paste member personal data into it.',
    saved: 'Saved',
    bulletinsArchived: (archived: number, duplicates: number) =>
      `Archived ${archived} past bulletin${archived === 1 ? '' : 's'}` +
      (duplicates > 0 ? ` (${duplicates} already archived)` : ''),
    saveFailed: 'Could not save — changes may be lost',
    storageUnavailable: 'Saved data could not be loaded, so changes in this tool will not be kept',
  },
  'zh-TW': {
    back: 'AI 工具',
    loadError: (name: string) => `無法載入「${name}」`,
    openExternal: '在新分頁開啟',
    externalHint: '此工具由 Light Church 以外的服務提供，請勿貼上會友個人資料。',
    saved: '已儲存',
    bulletinsArchived: (archived: number, duplicates: number) =>
      `已存檔 ${archived} 份過去週刊` + (duplicates > 0 ? `（${duplicates} 份已存在）` : ''),
    saveFailed: '無法儲存——變更可能會遺失',
    storageUnavailable: '無法載入已儲存的資料，此工具內的變更將不會保留',
  },
} satisfies Messages<{
  back: string;
  loadError: (name: string) => string;
  openExternal: string;
  externalHint: string;
  saved: string;
  saveFailed: string;
  storageUnavailable: string;
  bulletinsArchived: (archived: number, duplicates: number) => string;
}>;

type SaveState = 'idle' | 'saved' | 'failed' | 'unavailable';

const SAVE_DEBOUNCE_MS = 500;

export default function AiToolViewerPage() {
  const t = useT(messages);
  const { lang } = useLanguage();
  const { name: rawName } = useParams<{ name: string }>();
  const name = decodeURIComponent(rawName);
  const [tool, setTool] = useState<AiToolDetail | null>(null);
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [notice, setNotice] = useState<ToolServerNotice | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canPersist = useRef(false);
  const pending = useRef<Record<string, string> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageUrl = `/api/v1/ai-tools/${encodeURIComponent(name)}/storage`;

  useEffect(() => {
    let cancelled = false;
    setTool(null);
    setSrcDoc(null);
    setError(false);
    setSaveState('idle');
    setNotice(null);
    canPersist.current = false;

    const load = async () => {
      const res = await authFetch<{ success: boolean; data: AiToolDetail }>(
        `/api/v1/ai-tools/${encodeURIComponent(name)}`,
      );
      if (res.data.kind !== 'html') return { tool: res.data, snapshot: null };
      // If saved data can't be read, run the tool with an empty store but never
      // write back — that would overwrite the user's real saved data.
      const snapshot = await authFetch<{ success: boolean; data: Record<string, string> }>(
        storageUrl,
      )
        .then((s) => s.data)
        .catch(() => null);
      return { tool: res.data, snapshot };
    };

    load()
      .then(({ tool: loaded, snapshot }) => {
        if (cancelled) return;
        setTool(loaded);
        if (loaded.kind === 'html') {
          canPersist.current = snapshot !== null;
          if (snapshot === null) setSaveState('unavailable');
          setSrcDoc(buildToolSrcDoc(loaded.html ?? '', snapshot ?? {}));
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [name, storageUrl]);

  // Persist localStorage changes posted by the tool's storage shim.
  useEffect(() => {
    const save = (keepalive: boolean) => {
      const data = pending.current;
      if (!data || !canPersist.current) return;
      pending.current = null;
      authFetch(storageUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
        keepalive,
      })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('failed'));
    };
    const onMessage = (event: MessageEvent) => {
      // Only trust messages from this page's own tool frame.
      const frame = iframeRef.current?.contentWindow;
      if (!frame || event.source !== frame) return;
      if (isToolFetchRequest(event.data)) {
        const request = event.data;
        void handleToolServerRequest(name, request).then((res) => {
          if (res.notice) setNotice(res.notice);
          const result: ToolFetchResult = {
            type: TOOL_FETCH_RESULT,
            id: request.id,
            status: res.status,
            body: res.body,
          };
          frame.postMessage(result, '*');
        });
        return;
      }
      if (!isToolStorageMessage(event.data)) return;
      pending.current = event.data.data;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(false), SAVE_DEBOUNCE_MS);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      save(true); // flush on navigation away
    };
  }, [storageUrl, name]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/ai-tools">
            <ArrowLeft className="mr-1 size-4" />
            {t.back}
          </Link>
        </Button>
        <h1 className="truncate text-lg font-semibold">{tool ? aiToolLabel(tool, lang) : name}</h1>
        <div className="ml-auto flex items-center gap-3">
          {notice?.kind === 'bulletinsArchived' && (
            <span className="text-xs text-muted-foreground">
              {t.bulletinsArchived(notice.archived, notice.duplicates)}
            </span>
          )}
          {saveState !== 'idle' && (
            <span
              className={
                saveState === 'saved'
                  ? 'text-xs text-muted-foreground'
                  : 'text-xs text-amber-600 dark:text-amber-400'
              }
            >
              {saveState === 'saved'
                ? t.saved
                : saveState === 'failed'
                  ? t.saveFailed
                  : t.storageUnavailable}
            </span>
          )}
        </div>
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
            <CardTitle className="text-base">{aiToolLabel(tool, lang)}</CardTitle>
            {aiToolDescription(tool, lang) && (
              <CardDescription>{aiToolDescription(tool, lang)}</CardDescription>
            )}
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
          ref={iframeRef}
          srcDoc={srcDoc ?? ''}
          sandbox="allow-scripts allow-forms allow-modals allow-downloads allow-popups"
          className="w-full flex-1 rounded-lg border bg-background"
          title={aiToolLabel(tool, lang)}
        />
      )}
    </div>
  );
}
