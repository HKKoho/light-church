'use client';

import { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    open: 'Open (signed in)',
    popupBlocked: 'Your browser blocked the new tab. Allow pop-ups for this site and try again.',
    failed: 'Could not sign you in to this tool.',
  },
  'zh-TW': {
    open: '開啟（已登入）',
    popupBlocked: '瀏覽器阻擋了新分頁。請允許此網站的彈出視窗後再試一次。',
    failed: '無法以單一登入開啟此工具。',
  },
} satisfies Messages<{ open: string; popupBlocked: string; failed: string }>;

/**
 * Opens a link tool signed in with the user's Light Church account: fetches a
 * 60-second, single-use hand-off from the API and POSTs it to the tool in a new
 * tab. A form POST keeps the token out of URLs, history and server logs.
 */
export function SsoLaunchButton({ toolName }: { toolName: string }) {
  const t = useT(messages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launch = async () => {
    setError(null);
    // Open the tab synchronously (inside the click) so pop-up blockers allow it.
    const target = `lc-sso-${toolName}`;
    const win = window.open('about:blank', target);
    if (!win) {
      setError(t.popupBlocked);
      return;
    }
    win.opener = null; // the tool must not be able to navigate this tab
    setBusy(true);
    try {
      const res = await authFetch<{ success: boolean; data: { action: string; token: string } }>(
        `/api/v1/ai-tools/${encodeURIComponent(toolName)}/sso`,
        { method: 'POST' },
      );
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = res.data.action;
      form.target = target;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'token';
      input.value = res.data.token;
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      form.remove();
    } catch (err: unknown) {
      win.close();
      setError(err instanceof Error && err.message ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      <Button className="w-fit" onClick={() => void launch()} disabled={busy}>
        {busy ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <ExternalLink className="mr-2 size-4" />
        )}
        {t.open}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
