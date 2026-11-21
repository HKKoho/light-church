'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import {
  THEOLOGY_DOCTRINE_TAGS,
  type ReadingSourceDetail,
  type ReadingSourceSummary,
  type ReviewReadingSourceInput,
  type TheologyDoctrineTag,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useTheologyT } from '../messages';
import { API, ErrorBanner, Field, errorMessage } from '../shared';

/** Read the extracted text, set doctrine tags, approve or reject. */
export function ReviewDialog({
  sourceId,
  onClose,
  onReviewed,
}: {
  sourceId: string | null;
  onClose: () => void;
  onReviewed: (source: ReadingSourceSummary) => void;
}) {
  const t = useTheologyT();
  const [detail, setDetail] = useState<ReadingSourceDetail | null>(null);
  const [tags, setTags] = useState<TheologyDoctrineTag[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    if (!sourceId) return;
    let cancelled = false;
    authFetch<{ data: ReadingSourceDetail }>(`${API}/sources/${sourceId}`)
      .then((res) => {
        if (cancelled) return;
        setDetail(res.data);
        setTags([...res.data.doctrineTags]);
        setNote(res.data.reviewNote ?? '');
      })
      .catch((err: unknown) => !cancelled && setError(errorMessage(err, t.failed)));
    return () => {
      cancelled = true;
    };
  }, [sourceId, t.failed]);

  const toggle = (tag: TheologyDoctrineTag) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));

  const submit = async (status: 'approved' | 'rejected') => {
    if (!sourceId) return;
    if (status === 'rejected' && !note.trim()) {
      setError(t.noteRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body: ReviewReadingSourceInput = {
        status,
        doctrineTags: tags,
        reviewNote: note.trim() || undefined,
      };
      const res = await authFetch<{ data: ReadingSourceSummary }>(
        `${API}/sources/${sourceId}/review`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
      onReviewed(res.data);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!sourceId} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{detail ? `${t.reviewTitle}: ${detail.title}` : t.reviewTitle}</DialogTitle>
          <DialogDescription>{t.reviewHint}</DialogDescription>
        </DialogHeader>
        {!detail && !error ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : detail ? (
          <div className="flex flex-col gap-4">
            <Field label={t.extracted}>
              <pre className="max-h-72 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                {detail.content.slice(0, 20000)}
              </pre>
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">{t.doctrineTags}</legend>
              <p className="text-xs text-muted-foreground">{t.doctrineTagsHint}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {THEOLOGY_DOCTRINE_TAGS.map((tag) => (
                  <div key={tag} className="flex items-center gap-2">
                    <input
                      id={`tl-tag-${tag}`}
                      type="checkbox"
                      className="size-4 rounded border"
                      checked={tags.includes(tag)}
                      onChange={() => toggle(tag)}
                    />
                    <Label htmlFor={`tl-tag-${tag}`} className="font-normal">
                      {t.traditions[tag]}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
            <Field id="tl-note" label={t.reviewNote} hint={t.reviewNoteHint}>
              <Textarea
                id="tl-note"
                value={note}
                maxLength={1000}
                rows={2}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>
        ) : null}
        <ErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t.cancel}
          </Button>
          <Button variant="outline" onClick={() => submit('rejected')} disabled={busy || !detail}>
            <X className="size-4" />
            {t.reject}
          </Button>
          <Button onClick={() => submit('approved')} disabled={busy || !detail}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t.approve}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
