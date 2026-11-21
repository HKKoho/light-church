'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Plus, RefreshCw } from 'lucide-react';
import type { ReadingSourceSummary } from '@clawix/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/auth';
import { DeleteButton } from '../../../../wisdom-in-bible/shared';
import { useTheologyT } from '../messages';
import {
  API,
  ErrorBanner,
  PageHeader,
  SourceStatusBadge,
  THEOLOGY_PATH,
  errorMessage,
  useTheologyRoles,
} from '../shared';
import { ReviewDialog } from './review-dialog';
import { UploadDialog } from './upload-dialog';

const POLL_MS = 5000;

/** Staff: the curated theology library — upload, review, reprocess, delete. */
export default function TheologyLibraryPage() {
  const t = useTheologyT();
  const { isReader, isCurator } = useTheologyRoles();
  const [sources, setSources] = useState<ReadingSourceSummary[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch<{ data: ReadingSourceSummary[] }>(`${API}/sources`);
      setSources(res.data);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  }, [t.failed]);

  useEffect(() => {
    if (isReader) void load();
  }, [isReader, load]);

  // Refresh while anything is still being read and indexed.
  const processing = sources?.some((s) => s.status === 'processing') ?? false;
  useEffect(() => {
    if (!processing) return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [processing, load]);

  const replace = (updated: ReadingSourceSummary) =>
    setSources((prev) => {
      const rest = (prev ?? []).filter((s) => s.id !== updated.id);
      return [updated, ...rest];
    });

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  };

  const reprocess = (id: string) =>
    act(async () => {
      const res = await authFetch<{ data: ReadingSourceSummary }>(
        `${API}/sources/${id}/reprocess`,
        {
          method: 'POST',
        },
      );
      replace(res.data);
    });

  const remove = (id: string) =>
    act(async () => {
      await authFetch(`${API}/sources/${id}`, { method: 'DELETE' });
      setSources((prev) => (prev ?? []).filter((s) => s.id !== id));
    });

  return (
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <PageHeader
        backHref={THEOLOGY_PATH}
        backLabel={t.title}
        title={t.libraryTitle}
        subtitle={t.libraryHint}
      />
      {!isReader ? (
        <p className="text-sm text-muted-foreground">{t.noAccess}</p>
      ) : (
        <>
          {isCurator && (
            <Button className="w-fit" onClick={() => setUploading(true)}>
              <Plus className="size-4" />
              {t.upload}
            </Button>
          )}
          <ErrorBanner message={error} />
          {!sources && !error && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
          {sources?.length === 0 && (
            <p className="text-sm text-muted-foreground">{isCurator ? t.empty : t.emptyReader}</p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {sources?.map((s) => (
              <Card key={s.id} className="gap-2 py-4">
                <CardHeader className="gap-1.5 px-4">
                  <CardTitle className="flex min-w-0 items-start gap-2 text-sm">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 break-words">{s.title}</span>
                    <span className="ml-auto shrink-0">
                      <SourceStatusBadge status={s.status} />
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {[s.author, t.kinds[s.kind], t.languages[s.language]]
                      .filter(Boolean)
                      .join(' · ')}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground">
                    {[
                      s.chunkCount > 0 ? t.passages(s.chunkCount) : null,
                      s.pageCount ? t.pages(s.pageCount) : null,
                      s.ocrPagesUsed > 0 ? t.ocr(s.ocrPagesUsed) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {s.doctrineTags.length === 0 ? (
                      <Badge variant="outline" className="text-[10px]">
                        {t.general}
                      </Badge>
                    ) : (
                      s.doctrineTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {t.traditions[tag]}
                        </Badge>
                      ))
                    )}
                  </div>
                  {(s.statusDetail || s.reviewNote) && (
                    <p className="text-xs text-muted-foreground">
                      {s.statusDetail ?? s.reviewNote}
                    </p>
                  )}
                  {isCurator && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {s.status !== 'processing' && s.status !== 'failed' && (
                        <Button size="sm" variant="outline" onClick={() => setReviewing(s.id)}>
                          {t.review}
                        </Button>
                      )}
                      {s.status !== 'processing' && (
                        <Button size="sm" variant="ghost" onClick={() => void reprocess(s.id)}>
                          <RefreshCw className="size-4" />
                          {t.reprocess}
                        </Button>
                      )}
                      {s.status === 'processing' && (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      )}
                      <span className="ml-auto">
                        <DeleteButton
                          name={s.title}
                          body={t.deleteBody}
                          onConfirm={() => void remove(s.id)}
                        />
                      </span>
                    </div>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        </>
      )}

      <UploadDialog
        open={uploading}
        onClose={() => setUploading(false)}
        onUploaded={(source) => {
          setUploading(false);
          replace(source);
        }}
      />
      <ReviewDialog
        sourceId={reviewing}
        onClose={() => setReviewing(null)}
        onReviewed={(source) => {
          setReviewing(null);
          replace(source);
        }}
      />
    </div>
  );
}
