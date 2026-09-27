'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Loader2, XCircle } from 'lucide-react';
import type { ChurchSiteInfo, SitePageSummary } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/auth';
import { useChurchWebT } from './messages';
import { ErrorBanner, errorMessage, Field } from './shared';

const POLL_MS = 2000;

interface Props {
  readonly site: ChurchSiteInfo;
  readonly pages: readonly SitePageSummary[];
  /** Reload the site and pages (after an import finishes). */
  readonly onChanged: () => Promise<ChurchSiteInfo | null>;
}

export function ImportTab({ site, pages, onChanged }: Props) {
  const t = useChurchWebT();
  const [url, setUrl] = useState(site.sourceUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const running = site.importStatus === 'running';

  // Poll while an import runs; onChanged refreshes `site`, ending the loop.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void onChanged(), POLL_MS);
    return () => clearInterval(timer);
  }, [running, onChanged]);

  const start = async () => {
    setError(null);
    setStarting(true);
    try {
      await authFetch('/api/v1/church-site/import', {
        method: 'POST',
        body: JSON.stringify({ url: url.trim() }),
      });
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setStarting(false);
    }
  };

  const imported = pages.filter((p) => p.sourceUrl).length;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t.importIntro}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field id="import-url" label={t.importUrl} className="flex-1">
            <Input
              id="import-url"
              type="url"
              placeholder="https://www.example-church.org"
              value={url}
              disabled={running}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <Button onClick={() => void start()} disabled={running || starting || !url.trim()}>
            {running || starting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {site.importedAt ? t.reimport : t.startImport}
          </Button>
        </div>
        {site.importedAt && <p className="text-xs text-muted-foreground">{t.reimportNote}</p>}

        {running && (
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            {t.running}
          </p>
        )}
        {site.importStatus === 'done' && (
          <p className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="size-4" />
            {t.done(`${imported} ${t.tabs.pages.toLowerCase()}`)}
            {site.importedAt && (
              <span className="text-muted-foreground">
                {' '}
                · {new Date(site.importedAt).toLocaleString()}
              </span>
            )}
          </p>
        )}
        {site.importStatus === 'failed' && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="size-4" />
            {t.failedImport(site.importError ?? t.failed)}
          </p>
        )}
        <ErrorBanner message={error} />
      </CardContent>
    </Card>
  );
}
