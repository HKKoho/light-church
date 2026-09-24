'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';
import type { ConnectorStatus, UpdateConnectorsInput } from '@clawix/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useT, type Messages } from '@/lib/i18n';

const API = '/api/v1/connectors';

const en = {
  title: 'Connectors',
  description:
    'Church-wide accounts AI Tools publish through. Secrets are stored encrypted and never shown again.',
  connected: 'Connected',
  notConnected: 'Not connected',
  googleTitle: 'Google Forms',
  googleHint:
    'Used by AI Survey. Create a service account in Google Cloud, enable the Google Forms and Google Drive APIs, then paste its JSON key here. Forms are shared with the person who publishes them.',
  googleKey: 'Service-account key (JSON)',
  googleAs: (email: string) => `Creating forms as ${email}`,
  vercelTitle: 'Vercel',
  vercelHint:
    'Used by QR Registration. Create an access token in Vercel (Account Settings → Tokens). Each event is published as its own project.',
  vercelToken: 'Access token',
  vercelTeam: 'Team ID (optional)',
  vercelProject: 'Project name prefix',
  keepSecret: 'Leave blank to keep the current one',
  save: 'Save',
  disconnect: 'Disconnect',
  saved: 'Saved',
  failed: 'Something went wrong',
};

const messages = {
  en,
  'zh-TW': {
    title: '連接器',
    description: 'AI 工具用來發佈內容的教會帳戶。密鑰會加密儲存，之後不會再顯示。',
    connected: '已連接',
    notConnected: '未連接',
    googleTitle: 'Google 表單',
    googleHint:
      '供 AI 問卷使用。在 Google Cloud 建立服務帳戶，啟用 Google Forms 及 Google Drive API，然後在此貼上其 JSON 金鑰。表單會與發佈者共用。',
    googleKey: '服務帳戶金鑰（JSON）',
    googleAs: (email: string) => `以 ${email} 建立表單`,
    vercelTitle: 'Vercel',
    vercelHint:
      '供 QR 報名使用。在 Vercel（Account Settings → Tokens）建立存取權杖。每個活動會發佈為獨立專案。',
    vercelToken: '存取權杖',
    vercelTeam: '團隊 ID（選填）',
    vercelProject: '專案名稱前綴',
    keepSecret: '留空即保留現有設定',
    save: '儲存',
    disconnect: '中斷連接',
    saved: '已儲存',
    failed: '發生錯誤',
  },
} satisfies Messages<typeof en>;

function StatusBadge({ on, t }: { on: boolean; t: typeof en }) {
  return on ? (
    <Badge variant="secondary" className="gap-1 text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="size-3" />
      {t.connected}
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CircleDashed className="size-3" />
      {t.notConnected}
    </Badge>
  );
}

export default function ConnectorsPage() {
  const t = useT(messages);
  const [status, setStatus] = useState<ConnectorStatus | null>(null);
  const [googleJson, setGoogleJson] = useState('');
  const [vercelToken, setVercelToken] = useState('');
  const [vercelTeamId, setVercelTeamId] = useState('');
  const [vercelProject, setVercelProject] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const apply = (data: ConnectorStatus) => {
    setStatus(data);
    setVercelTeamId(data.vercel.teamId ?? '');
    setVercelProject(data.vercel.projectName);
  };

  useEffect(() => {
    authFetch<{ data: ConnectorStatus }>(API)
      .then((res) => {
        apply(res.data);
      })
      .catch((err: unknown) => {
        setMessage(err instanceof Error ? err.message : t.failed);
      });
    // Load once on mount.
  }, []);

  const save = async (body: UpdateConnectorsInput) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await authFetch<{ data: ConnectorStatus }>(API, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      apply(res.data);
      setGoogleJson('');
      setVercelToken('');
      setMessage(t.saved);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  const spin = busy ? <Loader2 className="size-4 animate-spin" /> : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t.googleTitle}
            {status && <StatusBadge on={status.google.configured} t={t} />}
          </CardTitle>
          <CardDescription>{t.googleHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {status?.google.clientEmail && (
            <p className="font-mono text-xs text-muted-foreground">
              {t.googleAs(status.google.clientEmail)}
            </p>
          )}
          <Label htmlFor="google-key">{t.googleKey}</Label>
          <Textarea
            id="google-key"
            rows={4}
            className="font-mono text-xs"
            placeholder={
              status?.google.configured ? t.keepSecret : '{ "type": "service_account", … }'
            }
            value={googleJson}
            onChange={(e) => {
              setGoogleJson(e.target.value);
            }}
          />
          <div className="flex gap-2">
            <Button
              disabled={busy || !googleJson.trim()}
              onClick={() => void save({ googleServiceAccountJson: googleJson })}
            >
              {spin}
              {t.save}
            </Button>
            {status?.google.configured && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void save({ googleServiceAccountJson: '' })}
              >
                {t.disconnect}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t.vercelTitle}
            {status && <StatusBadge on={status.vercel.configured} t={t} />}
          </CardTitle>
          <CardDescription>{t.vercelHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vercel-token">{t.vercelToken}</Label>
              <Input
                id="vercel-token"
                type="password"
                autoComplete="off"
                placeholder={status?.vercel.configured ? t.keepSecret : ''}
                value={vercelToken}
                onChange={(e) => {
                  setVercelToken(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vercel-team">{t.vercelTeam}</Label>
              <Input
                id="vercel-team"
                value={vercelTeamId}
                onChange={(e) => {
                  setVercelTeamId(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vercel-project">{t.vercelProject}</Label>
              <Input
                id="vercel-project"
                value={vercelProject}
                onChange={(e) => {
                  setVercelProject(e.target.value.toLowerCase());
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={busy || !vercelProject}
              onClick={() =>
                void save({
                  ...(vercelToken ? { vercelToken } : {}),
                  vercelTeamId,
                  vercelProjectName: vercelProject,
                })
              }
            >
              {spin}
              {t.save}
            </Button>
            {status?.vercel.configured && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void save({ vercelToken: '' })}
              >
                {t.disconnect}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
