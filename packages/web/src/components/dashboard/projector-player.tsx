'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { authFetch, getAccessToken } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useT, type Messages } from '@/lib/i18n';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

/** Message protocol for projector iframe → parent communication. */
interface ProjectorSaveMessage {
  type: 'projector:save';
  filename: string;
  content: string; // base64 for binary, plain text for text files
  encoding?: 'base64' | 'text';
}

type SaveStatus = { kind: 'saving' | 'saved' | 'error'; text: string } | null;

const messages = {
  en: {
    loadItemError: (name: string) => `Failed to load "${name}"`,
    saving: (f: string) => `Saving ${f}…`,
    savedTo: (p: string) => `Saved to workspace: ${p}`,
    saveError: (m: string) => `Error: ${m}`,
    notAuthenticated: 'Not authenticated',
    uploadFailed: 'Upload failed',
    saveFailed: 'Save failed',
  },
  'zh-TW': {
    loadItemError: (name: string) => `無法載入「${name}」`,
    saving: (f: string) => `儲存中 ${f}…`,
    savedTo: (p: string) => `已儲存至工作區：${p}`,
    saveError: (m: string) => `錯誤：${m}`,
    notAuthenticated: '尚未驗證身分',
    uploadFailed: '上傳失敗',
    saveFailed: '儲存失敗',
  },
} satisfies Messages<{
  loadItemError: (name: string) => string;
  saving: (f: string) => string;
  savedTo: (p: string) => string;
  saveError: (m: string) => string;
  notAuthenticated: string;
  uploadFailed: string;
  saveFailed: string;
}>;

interface ProjectorPlayerProps {
  /** Workspace projector item to load (`/projector/<name>/index.html`), or null when closed. */
  readonly name: string | null;
  /** Pre-built HTML to show instead of loading `name` (e.g. the built-in demo). */
  readonly html?: string | null;
  readonly title: string;
  readonly onClose: () => void;
  readonly onError?: (message: string) => void;
}

/**
 * Plays a projector micro-tool or game (agent-built HTML in the user's
 * workspace) in a modal, and handles its `projector:save` channel, which writes
 * files back to `/Output/Projector/` in the workspace.
 */
export function ProjectorPlayer({ name, html, title, onClose, onError }: ProjectorPlayerProps) {
  const t = useT(messages);
  const [loadedHtml, setLoadedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const open = name !== null || Boolean(html);
  const activeHtml = html ?? loadedHtml;

  useEffect(() => {
    setSaveStatus(null);
    setLoadedHtml(null);
    if (name === null || html) return;
    let cancelled = false;
    setLoading(true);
    authFetch<{ success: boolean; data: { name: string; html: string } }>(
      `/api/v1/workspace/projector/${encodeURIComponent(name)}`,
    )
      .then((res) => {
        if (!cancelled) setLoadedHtml(res.data.html);
      })
      .catch(() => {
        if (cancelled) return;
        onError?.(t.loadItemError(name));
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Reload only when the item changes (not when the parent re-creates callbacks).
  }, [name, html]);

  const flash = useCallback((status: SaveStatus, ms: number) => {
    setSaveStatus(status);
    setTimeout(() => {
      setSaveStatus(null);
    }, ms);
  }, []);

  // Save-to-workspace channel. Only trust messages from this player's frame.
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if ((event.data as { type?: unknown } | null)?.type !== 'projector:save') return;

      const msg = event.data as ProjectorSaveMessage;
      const outputPath = `/Output/Projector/${msg.filename}`;
      const reply = (result: Record<string, unknown>) =>
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'projector:save-result', ...result },
          '*',
        );

      try {
        setSaveStatus({ kind: 'saving', text: t.saving(msg.filename) });
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error(t.notAuthenticated);
        const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

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

        flash({ kind: 'saved', text: t.savedTo(outputPath) }, 3000);
        reply({ success: true, path: outputPath });
      } catch (err) {
        const message = err instanceof Error ? err.message : t.saveFailed;
        flash({ kind: 'error', text: t.saveError(message) }, 5000);
        reply({ success: false, error: message });
      }
    };

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, [t, flash]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton
        className="flex h-[85vh] !w-[70vw] !max-w-none flex-col gap-0 p-0 overflow-hidden [&>[data-slot=dialog-close]]:z-50 [&>[data-slot=dialog-close]]:bg-background/80 [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:p-1"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

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

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={activeHtml}
            sandbox="allow-scripts allow-forms allow-modals allow-downloads allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            className="h-full w-full border-0"
            title={title}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
