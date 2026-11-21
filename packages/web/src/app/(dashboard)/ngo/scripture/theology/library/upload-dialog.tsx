'use client';

import { useState, type SyntheticEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import {
  MAX_THEOLOGY_FILE_BYTES,
  THEOLOGY_LANGUAGES,
  THEOLOGY_SOURCE_KINDS,
  type ReadingSourceSummary,
  type TheologyLanguage,
  type TheologySourceKind,
  type TheologyUploadMimeType,
  type UploadReadingSourceInput,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authFetch } from '@/lib/auth';
import { EnumSelect } from '../../sunday-school/studio/shared';
import { useTheologyT } from '../messages';
import { API, ErrorBanner, Field, errorMessage } from '../shared';

const MIME_BY_EXT: Record<string, TheologyUploadMimeType> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  md: 'text/markdown',
  markdown: 'text/markdown',
  txt: 'text/plain',
};
const ACCEPT = Object.keys(MIME_BY_EXT)
  .map((ext) => `.${ext}`)
  .join(',');

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

export function UploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (source: ReadingSourceSummary) => void;
}) {
  const t = useTheologyT();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [kind, setKind] = useState<TheologySourceKind>('book');
  const [language, setLanguage] = useState<TheologyLanguage>('zh-TW');
  const [copyright, setCopyright] = useState(false);
  const [copyrightNote, setCopyrightNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mimeType = file ? MIME_BY_EXT[file.name.split('.').pop()?.toLowerCase() ?? ''] : undefined;

  const reset = () => {
    setFile(null);
    setTitle('');
    setAuthor('');
    setCopyright(false);
    setCopyrightNote('');
    setError(null);
  };

  const pickFile = (picked: File | null) => {
    setError(null);
    setFile(picked);
    if (picked && !title) setTitle(picked.name.replace(/\.[^.]+$/, ''));
    if (picked && picked.size > MAX_THEOLOGY_FILE_BYTES) setError(t.tooLarge);
  };

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!file || !mimeType || !copyright || file.size > MAX_THEOLOGY_FILE_BYTES) return;
    setBusy(true);
    setError(null);
    try {
      const body: UploadReadingSourceInput = {
        title: title.trim(),
        author: author.trim() || undefined,
        kind,
        language,
        fileName: file.name,
        mimeType,
        base64: await readBase64(file),
        copyrightConfirmed: true,
        copyrightNote: copyrightNote.trim() || undefined,
      };
      const res = await authFetch<{ data: ReadingSourceSummary }>(`${API}/sources`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onUploaded(res.data);
      reset();
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.uploadTitle}</DialogTitle>
          <DialogDescription>{t.uploadHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field id="tl-file" label={t.file} hint={t.fileHint}>
            <Input
              id="tl-file"
              type="file"
              accept={ACCEPT}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field id="tl-title" label={t.titleLabel}>
            <Input
              id="tl-title"
              value={title}
              maxLength={300}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field id="tl-author" label={t.author}>
            <Input
              id="tl-author"
              value={author}
              maxLength={200}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="tl-kind" label={t.kind}>
              <EnumSelect
                id="tl-kind"
                value={kind}
                options={THEOLOGY_SOURCE_KINDS}
                labels={t.kinds}
                onChange={setKind}
              />
            </Field>
            <Field id="tl-lang" label={t.language}>
              <EnumSelect
                id="tl-lang"
                value={language}
                options={THEOLOGY_LANGUAGES}
                labels={t.languages}
                onChange={setLanguage}
              />
            </Field>
          </div>
          <div className="flex items-start gap-3">
            <input
              id="tl-copyright"
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border"
              checked={copyright}
              onChange={(e) => setCopyright(e.target.checked)}
            />
            <Label htmlFor="tl-copyright" className="leading-snug font-normal">
              {t.copyright}
            </Label>
          </div>
          <Field id="tl-cnote" label={t.copyrightNote} hint={t.copyrightNoteHint}>
            <Input
              id="tl-cnote"
              value={copyrightNote}
              maxLength={500}
              onChange={(e) => setCopyrightNote(e.target.value)}
            />
          </Field>
          <ErrorBanner message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={
                busy ||
                !file ||
                !mimeType ||
                !title.trim() ||
                !copyright ||
                file.size > MAX_THEOLOGY_FILE_BYTES
              }
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {busy ? t.uploading : t.upload}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
