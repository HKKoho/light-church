'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { ConnectorStatus, UpdateConnectorsInput } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useT, type Messages } from '@/lib/i18n';

const en = {
  title: 'Church email (SMTP)',
  hint: 'Used by Rent Church Place to email applicants from the church address. Enter the outgoing mail server your church email provider gives you (e.g. smtp.office365.com or smtp.gmail.com with an app password).',
  host: 'SMTP server',
  port: 'Port',
  secure: 'TLS from the start (usually port 465; off for 587 STARTTLS)',
  username: 'Username',
  password: 'Password',
  fromAddress: 'From address (defaults to the username)',
  fromName: 'From name',
  keepSecret: 'Leave blank to keep the current one',
  save: 'Save',
  disconnect: 'Disconnect',
};

const messages = {
  en,
  'zh-TW': {
    title: '教會電郵（SMTP）',
    hint: '供「租借教會場地」以教會電郵地址回覆申請人。請輸入教會電郵服務提供的外寄郵件伺服器（例如 smtp.office365.com，或配合應用程式密碼的 smtp.gmail.com）。',
    host: 'SMTP 伺服器',
    port: '連接埠',
    secure: '一開始即使用 TLS（通常為 465 埠；587 STARTTLS 請關閉）',
    username: '使用者名稱',
    password: '密碼',
    fromAddress: '寄件地址（預設為使用者名稱）',
    fromName: '寄件人名稱',
    keepSecret: '留空即保留現有設定',
    save: '儲存',
    disconnect: '中斷連接',
  },
} satisfies Messages<typeof en>;

interface Props {
  readonly status: ConnectorStatus | null;
  readonly busy: boolean;
  readonly badge: ReactNode;
  readonly spin: ReactNode;
  readonly onSave: (body: UpdateConnectorsInput) => Promise<boolean>;
}

export function SmtpCard({ status, busy, badge, spin, onSave }: Props) {
  const t = useT(messages);
  const smtp = status?.smtp;
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [fromName, setFromName] = useState('');

  useEffect(() => {
    if (!smtp) return;
    setHost(smtp.host ?? '');
    setPort(String(smtp.port));
    setSecure(smtp.secure);
    setUsername(smtp.username ?? '');
    setFromAddress(smtp.fromAddress && smtp.fromAddress !== smtp.username ? smtp.fromAddress : '');
    setFromName(smtp.fromName ?? '');
  }, [smtp]);

  const portNumber = Number(port);
  const valid = host.trim() !== '' && Number.isInteger(portNumber) && portNumber > 0;

  const save = async () => {
    const ok = await onSave({
      smtpHost: host,
      smtpPort: portNumber,
      smtpSecure: secure,
      smtpUsername: username,
      ...(password ? { smtpPassword: password } : {}),
      smtpFromAddress: fromAddress,
      smtpFromName: fromName,
    });
    if (ok) setPassword('');
  };

  const disconnect = () =>
    void onSave({
      smtpHost: '',
      smtpUsername: '',
      smtpPassword: '',
      smtpFromAddress: '',
      smtpFromName: '',
    });

  const field = (id: string, label: string, input: ReactNode) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {input}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t.title}
          {badge}
        </CardTitle>
        <CardDescription>{t.hint}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
          {field(
            'smtp-host',
            t.host,
            <Input
              id="smtp-host"
              placeholder="smtp.example.org"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />,
          )}
          {field(
            'smtp-port',
            t.port,
            <Input
              id="smtp-port"
              inputMode="numeric"
              value={port}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, '');
                setPort(next);
                if (next === '465') setSecure(true);
                else if (next === '587' || next === '25') setSecure(false);
              }}
            />,
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={secure} onCheckedChange={setSecure} />
          {t.secure}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {field(
            'smtp-user',
            t.username,
            <Input
              id="smtp-user"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />,
          )}
          {field(
            'smtp-password',
            t.password,
            <Input
              id="smtp-password"
              type="password"
              autoComplete="new-password"
              placeholder={smtp?.configured ? t.keepSecret : ''}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />,
          )}
          {field(
            'smtp-from',
            t.fromAddress,
            <Input
              id="smtp-from"
              type="email"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
            />,
          )}
          {field(
            'smtp-from-name',
            t.fromName,
            <Input
              id="smtp-from-name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />,
          )}
        </div>
        <div className="flex gap-2">
          <Button disabled={busy || !valid} onClick={() => void save()}>
            {spin}
            {t.save}
          </Button>
          {smtp?.configured && (
            <Button variant="outline" disabled={busy} onClick={disconnect}>
              {t.disconnect}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
