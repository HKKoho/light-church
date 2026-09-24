'use client';

import { useState } from 'react';
import { Download, Eye, Loader2, QrCode, Rocket } from 'lucide-react';
import {
  AI_PUBLISH_ROLES,
  qrRegistrationSchema,
  type PublishedQrPage,
  type QrRegistrationInput,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { PublishedLink } from '@/components/dashboard/published-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { useQrT } from './messages';

const API = '/api/v1/qr-registration';

type TextField = 'eventName' | 'date' | 'time' | 'location' | 'registrationUrl';

const post = <T,>(path: string, body: unknown) =>
  authFetch<{ data: T }>(`${API}/${path}`, { method: 'POST', body: JSON.stringify(body) }).then(
    (res) => res.data,
  );

function downloadHtml(html: string, eventName: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${eventName.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'event'}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function QrRegistrationPage() {
  const t = useQrT();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const canUse = !!user && AI_PUBLISH_ROLES.includes(user.role);

  const [input, setInput] = useState<QrRegistrationInput>({
    eventName: '',
    date: '',
    time: '',
    location: '',
    description: '',
    registrationUrl: '',
    language: lang,
  });
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishedQrPage | null>(null);
  const [busy, setBusy] = useState<'preview' | 'download' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = qrRegistrationSchema.safeParse(input).success;
  const set = (patch: Partial<QrRegistrationInput>) => {
    setInput({ ...input, ...patch });
    setPublished(null);
  };

  const run = async (kind: 'preview' | 'download' | 'publish', action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(null);
    }
  };

  const fetchHtml = () => post<{ html: string }>('preview', input).then((d) => d.html);

  const field = (key: TextField, type = 'text', placeholder?: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={key}>{t[key]}</Label>
      <Input
        id={key}
        type={type}
        placeholder={placeholder}
        value={input[key]}
        onChange={(e) => {
          set({ [key]: e.target.value });
        }}
      />
    </div>
  );

  const spinner = (kind: typeof busy, Icon: typeof Eye) =>
    busy === kind ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Badge variant="outline" className="mb-2 font-mono text-[10px] uppercase tracking-wider">
          {t.phase}
        </Badge>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <QrCode className="size-6 text-emerald-500" />
          {t.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {!canUse ? (
        <p className="text-sm text-muted-foreground">{t.noAccess}</p>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4">
              {field('eventName', 'text', t.eventNamePlaceholder)}
              <div className="grid gap-4 sm:grid-cols-3">
                {field('date')}
                {field('time')}
                {field('location')}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">{t.description}</Label>
                <Textarea
                  id="description"
                  rows={3}
                  maxLength={2000}
                  value={input.description}
                  onChange={(e) => {
                    set({ description: e.target.value });
                  }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-col gap-1.5">
                  {field('registrationUrl', 'url', 'https://forms.gle/…')}
                  <span className="text-xs text-muted-foreground">{t.registrationUrlHint}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="page-language">{t.pageLanguage}</Label>
                  <select
                    id="page-language"
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={input.language}
                    onChange={(e) => {
                      set({ language: e.target.value as 'en' | 'zh-TW' });
                    }}
                  >
                    <option value="en">{t.languages.en}</option>
                    <option value="zh-TW">{t.languages['zh-TW']}</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  disabled={!valid || busy !== null}
                  onClick={() =>
                    void run('preview', async () => {
                      setPreviewHtml(await fetchHtml());
                    })
                  }
                >
                  {spinner('preview', Eye)}
                  {t.preview}
                </Button>
                <Button
                  variant="outline"
                  disabled={!valid || busy !== null}
                  onClick={() =>
                    void run('download', async () => {
                      downloadHtml(await fetchHtml(), input.eventName);
                    })
                  }
                >
                  {spinner('download', Download)}
                  {t.download}
                </Button>
                <Button
                  disabled={!valid || busy !== null}
                  onClick={() =>
                    void run('publish', async () => {
                      setPublished(await post<PublishedQrPage>('publish', input));
                    })
                  }
                >
                  {spinner('publish', Rocket)}
                  {busy === 'publish' ? t.publishing : t.publish}
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {published && (
            <Card className="border-emerald-500/50">
              <CardHeader>
                <CardTitle>{t.publishedTitle}</CardTitle>
                <CardDescription>{t.publicNote}</CardDescription>
              </CardHeader>
              <CardContent>
                <PublishedLink
                  label={t.pageLink}
                  url={published.url}
                  copyLabel={t.copy}
                  copiedLabel={t.copied}
                  openLabel={t.open}
                />
              </CardContent>
            </Card>
          )}

          {previewHtml && (
            <Card>
              <CardHeader>
                <CardTitle>{t.previewTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Empty sandbox: the page is static HTML, no scripts or same-origin access. */}
                <iframe
                  title={t.previewTitle}
                  sandbox=""
                  srcDoc={previewHtml}
                  className="h-[640px] w-full rounded-md border bg-white"
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
