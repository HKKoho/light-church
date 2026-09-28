'use client';

import { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import {
  EVENT_POST_ASPECTS,
  EVENT_POST_STYLES,
  type EventPostAspect,
  type EventPostImage,
  type EventPostStyle,
  type QrRegistrationInput,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { VISUAL4STORY_URL } from '@/lib/external-tools';
import { useQrT } from './messages';

const selectClass = 'h-9 rounded-md border bg-background px-2 text-sm';

const fileName = (eventName: string, mimeType: string) =>
  `${eventName.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'event'}-post.${
    mimeType === 'image/jpeg' ? 'jpg' : 'png'
  }`;

/** Designs a shareable post for the event with Gemini, or hands off to Visual4Story. */
export function PostDesigner({ event, ready }: { event: QrRegistrationInput; ready: boolean }) {
  const t = useQrT();
  const [aspectRatio, setAspectRatio] = useState<EventPostAspect>('1:1');
  const [style, setStyle] = useState<EventPostStyle>('warm');
  const [instructions, setInstructions] = useState('');
  const [post, setPost] = useState<EventPostImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch<{ data: EventPostImage }>('/api/v1/qr-registration/post', {
        method: 'POST',
        body: JSON.stringify({ ...event, aspectRatio, style, instructions }),
      });
      setPost(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  const src = post ? `data:${post.mimeType};base64,${post.imageBase64}` : null;

  const copyCaption = async () => {
    if (!post?.caption) return;
    try {
      await navigator.clipboard.writeText(post.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the caption is still visible to copy by hand.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-amber-500" />
          {t.postTitle}
        </CardTitle>
        <CardDescription>{t.postSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="post-aspect">{t.postSize}</Label>
            <select
              id="post-aspect"
              className={selectClass}
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as EventPostAspect)}
            >
              {EVENT_POST_ASPECTS.map((a) => (
                <option key={a} value={a}>
                  {t.postSizes[a]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="post-style">{t.postStyle}</Label>
            <select
              id="post-style"
              className={selectClass}
              value={style}
              onChange={(e) => setStyle(e.target.value as EventPostStyle)}
            >
              {EVENT_POST_STYLES.map((s) => (
                <option key={s} value={s}>
                  {t.postStyles[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="post-instructions">{t.postInstructions}</Label>
          <Textarea
            id="post-instructions"
            rows={2}
            maxLength={1000}
            placeholder={t.postInstructionsPlaceholder}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!ready || busy} onClick={() => void generate()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? t.postGenerating : post ? t.postRegenerate : t.postGenerate}
          </Button>
          <Button variant="outline" asChild title={t.visualHint}>
            <a href={VISUAL4STORY_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              {t.visual}
            </a>
          </Button>
        </div>
        {!ready && <p className="text-xs text-muted-foreground">{t.postNeedsName}</p>}
        <p className="text-xs text-muted-foreground">{t.postNote}</p>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {post && src && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <img
              src={src}
              alt={t.postAlt(event.eventName)}
              className="max-h-[560px] w-full rounded-md border object-contain sm:w-auto sm:max-w-md"
            />
            <div className="flex flex-1 flex-col gap-3">
              <Button variant="outline" className="w-fit" asChild>
                <a href={src} download={fileName(event.eventName, post.mimeType)}>
                  <Download className="size-4" />
                  {t.postDownload}
                </a>
              </Button>
              {post.caption && (
                <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
                  <span className="text-xs font-medium text-muted-foreground">{t.postCaption}</span>
                  <p className="whitespace-pre-wrap text-sm">{post.caption}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-fit"
                    onClick={() => void copyCaption()}
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? t.copied : t.postCopyCaption}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
