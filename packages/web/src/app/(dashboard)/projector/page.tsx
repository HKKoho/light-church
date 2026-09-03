'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MonitorPlay, Sparkles } from 'lucide-react';
import { authFetch, getAccessToken } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useT, useLanguage, type Messages } from '@/lib/i18n';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { buildDemoHtml, DEMO_KEY } from './demo';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProjectorItem {
  name: string;
  path: string;
}

/** Message protocol for projector iframe → parent communication. */
interface ProjectorSaveMessage {
  type: 'projector:save';
  filename: string;
  content: string; // base64 for binary, plain text for text files
  encoding?: 'base64' | 'text';
}

type SaveStatus = { kind: 'saving' | 'saved' | 'error'; text: string } | null;

/* ------------------------------------------------------------------ */
/*  i18n                                                               */
/* ------------------------------------------------------------------ */

const messages = {
  en: {
    title: 'Projector',
    subtitle: 'Micro-tools built by your agent',
    loadError: 'Failed to load projector items',
    loadItemError: (name: string) => `Failed to load "${name}"`,
    emptyTitle: 'No tools yet. Ask your agent to build one for you!',
    viewDemo: 'View demo',
    demoCardTitle: 'How it works',
    demoCardHint: 'Interactive demo — see how an agent builds a skill',
    saving: (f: string) => `Saving ${f}…`,
    savedTo: (p: string) => `Saved to workspace: ${p}`,
    saveError: (m: string) => `Error: ${m}`,
    notAuthenticated: 'Not authenticated',
    uploadFailed: 'Upload failed',
    saveFailed: 'Save failed',
    fallbackTitle: 'Projector',
  },
  'zh-TW': {
    title: '投影台',
    subtitle: '由您的代理打造的微型工具',
    loadError: '無法載入投影台項目',
    loadItemError: (name: string) => `無法載入「${name}」`,
    emptyTitle: '尚無工具。請您的代理為您打造一個！',
    viewDemo: '查看示範',
    demoCardTitle: '運作原理',
    demoCardHint: '互動示範 — 看看代理如何打造技能',
    saving: (f: string) => `儲存中 ${f}…`,
    savedTo: (p: string) => `已儲存至工作區：${p}`,
    saveError: (m: string) => `錯誤：${m}`,
    notAuthenticated: '尚未驗證身分',
    uploadFailed: '上傳失敗',
    saveFailed: '儲存失敗',
    fallbackTitle: '投影台',
  },
} satisfies Messages<{
  title: string;
  subtitle: string;
  loadError: string;
  loadItemError: (name: string) => string;
  emptyTitle: string;
  viewDemo: string;
  demoCardTitle: string;
  demoCardHint: string;
  saving: (f: string) => string;
  savedTo: (p: string) => string;
  saveError: (m: string) => string;
  notAuthenticated: string;
  uploadFailed: string;
  saveFailed: string;
  fallbackTitle: string;
}>;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectorPage() {
  const t = useT(messages);
  const { lang } = useLanguage();
  const [items, setItems] = useState<ProjectorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [activeHtml, setActiveHtml] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await authFetch<{ success: boolean; data: ProjectorItem[] }>(
        '/api/v1/workspace/projector',
      );
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // Listen for postMessage from iframe (save to workspace)
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.type !== 'projector:save') return;

      const msg = event.data as ProjectorSaveMessage;
      const outputPath = `/Output/Projector/${msg.filename}`;

      try {
        setSaveStatus({ kind: 'saving', text: t.saving(msg.filename) });

        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error(t.notAuthenticated);
        const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

        // Convert content to blob
        let blob: Blob;
        if (msg.encoding === 'base64') {
          const byteChars = atob(msg.content);
          const byteArr = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteArr[i] = byteChars.charCodeAt(i);
          }
          blob = new Blob([byteArr]);
        } else {
          blob = new Blob([msg.content], { type: 'text/plain' });
        }

        // Upload via workspace upload endpoint (FormData — no JSON content-type)
        const formData = new FormData();
        formData.append('file', blob, msg.filename);

        const res = await fetch(
          `${apiBase}/api/v1/workspace/files/upload?path=${encodeURIComponent(outputPath)}&overwrite=true`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: res.statusText }));
          throw new Error((body as { message?: string }).message ?? t.uploadFailed);
        }

        setSaveStatus({ kind: 'saved', text: t.savedTo(outputPath) });
        setTimeout(() => {
          setSaveStatus(null);
        }, 3000);

        // Notify iframe that save succeeded
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'projector:save-result', success: true, path: outputPath },
          '*',
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : t.saveFailed;
        setSaveStatus({ kind: 'error', text: t.saveError(message) });
        setTimeout(() => {
          setSaveStatus(null);
        }, 5000);

        iframeRef.current?.contentWindow?.postMessage(
          { type: 'projector:save-result', success: false, error: message },
          '*',
        );
      }
    };

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, [t]);

  const openItem = useCallback(
    async (name: string) => {
      setLoadingHtml(true);
      setActiveItem(name);
      setActiveHtml(null);
      setSaveStatus(null);
      try {
        const res = await authFetch<{
          success: boolean;
          data: { name: string; html: string };
        }>(`/api/v1/workspace/projector/${encodeURIComponent(name)}`);
        setActiveHtml(res.data.html);
      } catch {
        setError(t.loadItemError(name));
        setActiveItem(null);
      } finally {
        setLoadingHtml(false);
      }
    },
    [t],
  );

  // The built-in demo renders entirely client-side — no API call. It teaches how
  // an agent + skills + memory build a Projector tool, and reuses the real
  // `projector:save` protocol to write a generated SKILL.md into the workspace.
  const openDemo = useCallback(() => {
    setSaveStatus(null);
    setLoadingHtml(false);
    setActiveItem(DEMO_KEY);
    setActiveHtml(buildDemoHtml(lang));
  }, [lang]);

  const closeViewer = useCallback(() => {
    setActiveItem(null);
    setActiveHtml(null);
    setSaveStatus(null);
  }, []);

  const dialogTitle = activeItem === DEMO_KEY ? t.demoCardTitle : (activeItem ?? t.fallbackTitle);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <button
          onClick={openDemo}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Sparkles className="size-4" />
          {t.viewDemo}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Demo CTA card — always available so anyone can learn the workflow. */}
      <button
        onClick={openDemo}
        className="group flex items-center gap-4 rounded-lg border border-dashed border-primary/40 bg-card px-5 py-4 text-left transition-colors hover:bg-accent"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{t.demoCardTitle}</span>
          <span className="text-xs text-muted-foreground">{t.demoCardHint}</span>
        </div>
      </button>

      {/* Empty state */}
      {items.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <MonitorPlay className="mb-3 size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.emptyTitle}</p>
        </div>
      )}

      {/* Card grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <button
              key={item.name}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                activeItem === item.name && 'ring-2 ring-primary bg-accent text-accent-foreground',
              )}
              onClick={() => void openItem(item.name)}
            >
              <MonitorPlay className="size-4 shrink-0 text-muted-foreground" />
              {item.name}
            </button>
          ))}
        </div>
      )}

      {/* Projector modal */}
      <Dialog
        open={activeItem !== null}
        onOpenChange={(open) => {
          if (!open) closeViewer();
        }}
      >
        <DialogContent
          showCloseButton
          className="flex h-[85vh] !w-[70vw] !max-w-none flex-col gap-0 p-0 overflow-hidden [&>[data-slot=dialog-close]]:z-50 [&>[data-slot=dialog-close]]:bg-background/80 [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:p-1"
        >
          <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>

          {/* Save status bar */}
          {saveStatus && (
            <div
              className={cn(
                'px-4 py-2 text-xs font-medium',
                saveStatus.kind === 'error'
                  ? 'bg-destructive/20 text-destructive'
                  : saveStatus.kind === 'saving'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-green-500/20 text-green-400',
              )}
            >
              {saveStatus.text}
            </div>
          )}

          {loadingHtml ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={activeHtml}
              sandbox="allow-scripts allow-forms allow-modals allow-downloads allow-popups allow-popups-to-escape-sandbox allow-same-origin"
              className="h-full w-full border-0"
              title={dialogTitle}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
