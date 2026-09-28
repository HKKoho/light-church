'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, Send } from 'lucide-react';
import type { VenueApplicationInfo, VenueMailStatus } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage, type Lang } from '@/lib/i18n';
import { useVenueRentalT } from './messages';
import { replyDraft } from './reply-templates';

interface Props {
  readonly app: VenueApplicationInfo;
  /** null while loading. */
  readonly mail: VenueMailStatus | null;
  readonly onSend: (subject: string, body: string) => Promise<void>;
}

/** Display name from a `"Name" <address>` header, for the signature. */
const senderName = (from: string | null): string | null => /^"(.+)"/.exec(from ?? '')?.[1] ?? null;

export function ReplyDialog({ app, mail, onSend }: Props) {
  const t = useVenueRentalT();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draftLang, setDraftLang] = useState<Lang>(lang);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fill = (l: Lang) => {
    const draft = replyDraft(app, l, senderName(mail?.from ?? null) ?? t.churchSignature);
    setDraftLang(l);
    setSubject(draft.subject);
    setBody(draft.body);
  };

  const onOpenChange = (next: boolean) => {
    if (next) {
      fill(lang);
      setError(null);
    }
    setOpen(next);
  };

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await onSend(subject, body);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setSending(false);
    }
  };

  const configured = mail?.configured ?? false;
  const mailto = `mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Mail className="size-4" />
          {t.replyEmail}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.replyTitle(app.organization)}</DialogTitle>
          <DialogDescription>
            {configured && mail?.from ? t.replyFrom(mail.from, app.email) : t.replyTo(app.email)}
          </DialogDescription>
        </DialogHeader>

        {mail && !configured && (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm">
            {t.mailNotConnected}{' '}
            <Link href="/settings/connectors" className="underline">
              {t.mailSettings}
            </Link>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t.template}</span>
          {(['en', 'zh-TW'] as const).map((l) => (
            <Button
              key={l}
              size="sm"
              variant={draftLang === l ? 'default' : 'outline'}
              onClick={() => fill(l)}
            >
              {l === 'en' ? 'English' : '中文'}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`subject-${app.id}`}>{t.subject}</Label>
          <Input
            id={`subject-${app.id}`}
            value={subject}
            maxLength={300}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`body-${app.id}`}>{t.message}</Label>
          <Textarea
            id={`body-${app.id}`}
            rows={14}
            value={body}
            maxLength={10_000}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" asChild>
            <a href={mailto}>{t.openMailApp}</a>
          </Button>
          <Button
            disabled={!configured || sending || !subject.trim() || !body.trim()}
            onClick={() => void send()}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {t.send}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
