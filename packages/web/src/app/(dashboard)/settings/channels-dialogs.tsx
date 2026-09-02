'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useT, type Messages } from '@/lib/i18n';
import type { ApiChannel } from './channels-tab';

// ------------------------------------------------------------------ //
//  Constants                                                          //
// ------------------------------------------------------------------ //

const PLATFORM_DEFAULT_LABEL: Record<string, string> = {
  telegram: 'all',
  whatsapp: 'new',
  slack: 'off',
  web: 'all',
};

// ------------------------------------------------------------------ //
//  i18n                                                               //
// ------------------------------------------------------------------ //

const messages = {
  en: {
    create: {
      title: 'Add Channel',
      description: 'Configure a new messaging channel.',
      cancel: 'Cancel',
      submit: 'Add Channel',
    },
    edit: {
      title: 'Configure Channel',
      description: (name: string) => `Update settings for ${name}.`,
      cancel: 'Cancel',
      submit: 'Save',
    },
    typeLabel: 'Type',
    typeOptions: {
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
      web: 'Web',
    },
    nameLabel: 'Name',
    namePlaceholders: {
      telegram: 'Telegram Bot',
      whatsapp: 'WhatsApp Bot',
      web: 'Web Dashboard',
      fallback: 'Channel name',
    },
    telegram: {
      botToken: 'Bot Token',
      botTokenSetPlaceholder: 'Token is set — leave blank to keep',
      botTokenPlaceholder: 'Enter Telegram bot token from @BotFather',
      botTokenSetHelp: 'Leave blank to keep the current token.',
      botTokenHelp: 'Required for the bot to function.',
      mode: 'Mode',
      modePolling: 'Polling',
      modeWebhook: 'Webhook',
      webhookUrl: 'Webhook URL',
      webhookUrlHelp: 'Public HTTPS URL that Telegram will send updates to.',
      webhookSecret: 'Webhook Secret',
      webhookSecretSetPlaceholder: 'Secret is set — leave blank to keep',
      webhookSecretPlaceholder: 'Optional secret token for webhook verification',
      webhookSecretSetHelp: 'Leave blank to keep the current secret.',
      webhookSecretHelp: 'Optional. Used to verify incoming webhook requests.',
    },
    whatsapp: {
      line1:
        'WhatsApp uses the Baileys library — pairing happens via QR code, no API token is required.',
      line2Pre:
        'After enabling this channel, watch the API server logs for an ASCII QR code and scan it from the bot phone’s WhatsApp → ',
      line2Bold: 'Linked Devices → Link a Device',
      line2Post: '.',
      line3Pre: 'Auth state persists at ',
      line3Mid1: ' (default ',
      line3Mid2: ') — restarts won’t re-prompt for QR. Authorize a user by setting their ',
      line3Mid3: ' (e.g. ',
      line3Post: ').',
    },
    web: {
      enableProgress: 'Enable progress updates',
      enableToolHints: 'Enable tool call hints',
    },
    toolProgress: {
      label: 'Tool progress',
      default: (platformDefault: string) => `Default (${platformDefault})`,
      off: 'Off — no tool bubbles',
      new: 'New — only when tool changes',
      all: 'All — every tool call (preview)',
      verbose: 'Verbose — every tool call (full args)',
      help: 'Controls progress bubbles emitted between tool calls. Only applies when the agent has Streaming enabled.',
    },
  },
  'zh-TW': {
    create: {
      title: '新增頻道',
      description: '設定新的訊息頻道。',
      cancel: '取消',
      submit: '新增頻道',
    },
    edit: {
      title: '設定頻道',
      description: (name: string) => `更新 ${name} 的設定。`,
      cancel: '取消',
      submit: '儲存',
    },
    typeLabel: '類型',
    typeOptions: {
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
      web: '網頁',
    },
    nameLabel: '名稱',
    namePlaceholders: {
      telegram: 'Telegram Bot',
      whatsapp: 'WhatsApp Bot',
      web: '網頁儀表板',
      fallback: '頻道名稱',
    },
    telegram: {
      botToken: 'Bot Token',
      botTokenSetPlaceholder: 'Token 已設定 — 留空以保留',
      botTokenPlaceholder: '從 @BotFather 輸入 Telegram bot token',
      botTokenSetHelp: '留空以保留目前的 token。',
      botTokenHelp: 'bot 運作所必需。',
      mode: '模式',
      modePolling: '輪詢',
      modeWebhook: 'Webhook',
      webhookUrl: 'Webhook URL',
      webhookUrlHelp: 'Telegram 將傳送更新至此公開 HTTPS URL。',
      webhookSecret: 'Webhook Secret',
      webhookSecretSetPlaceholder: 'Secret 已設定 — 留空以保留',
      webhookSecretPlaceholder: '選填，用於 webhook 驗證的 secret token',
      webhookSecretSetHelp: '留空以保留目前的 secret。',
      webhookSecretHelp: '選填。用於驗證傳入的 webhook 請求。',
    },
    whatsapp: {
      line1: 'WhatsApp 使用 Baileys 函式庫 — 透過 QR code 配對，不需要 API token。',
      line2Pre:
        '啟用此頻道後，請留意 API 伺服器日誌中的 ASCII QR code，並從 bot 手機的 WhatsApp → ',
      line2Bold: '已連結的裝置 → 連結裝置',
      line2Post: ' 掃描它。',
      line3Pre: '驗證狀態會保存於 ',
      line3Mid1: '（預設 ',
      line3Mid2: '）— 重新啟動不會再次要求 QR。設定使用者的 ',
      line3Mid3: ' 以授權該使用者（例如 ',
      line3Post: '）。',
    },
    web: {
      enableProgress: '啟用進度更新',
      enableToolHints: '啟用工具呼叫提示',
    },
    toolProgress: {
      label: '工具進度',
      default: (platformDefault: string) => `預設（${platformDefault}）`,
      off: '關閉 — 不顯示工具泡泡',
      new: '新 — 僅在工具變更時',
      all: '全部 — 每次工具呼叫（預覽）',
      verbose: '詳細 — 每次工具呼叫（完整參數）',
      help: '控制工具呼叫之間發出的進度泡泡。僅在代理啟用串流時適用。',
    },
  },
} satisfies Messages<{
  create: { title: string; description: string; cancel: string; submit: string };
  edit: {
    title: string;
    description: (name: string) => string;
    cancel: string;
    submit: string;
  };
  typeLabel: string;
  typeOptions: { telegram: string; whatsapp: string; web: string };
  nameLabel: string;
  namePlaceholders: {
    telegram: string;
    whatsapp: string;
    web: string;
    fallback: string;
  };
  telegram: {
    botToken: string;
    botTokenSetPlaceholder: string;
    botTokenPlaceholder: string;
    botTokenSetHelp: string;
    botTokenHelp: string;
    mode: string;
    modePolling: string;
    modeWebhook: string;
    webhookUrl: string;
    webhookUrlHelp: string;
    webhookSecret: string;
    webhookSecretSetPlaceholder: string;
    webhookSecretPlaceholder: string;
    webhookSecretSetHelp: string;
    webhookSecretHelp: string;
  };
  whatsapp: {
    line1: string;
    line2Pre: string;
    line2Bold: string;
    line2Post: string;
    line3Pre: string;
    line3Mid1: string;
    line3Mid2: string;
    line3Mid3: string;
    line3Post: string;
  };
  web: { enableProgress: string; enableToolHints: string };
  toolProgress: {
    label: string;
    default: (platformDefault: string) => string;
    off: string;
    new: string;
    all: string;
    verbose: string;
    help: string;
  };
}>;

// ------------------------------------------------------------------ //
//  Create Channel Dialog                                              //
// ------------------------------------------------------------------ //

export function CreateChannelDialog({
  open,
  onOpenChange,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSubmit: (form: FormData) => void;
}) {
  const t = useT(messages);
  const [type, setType] = useState('telegram');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.create.title}</DialogTitle>
          <DialogDescription>{t.create.description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-type">{t.typeLabel}</Label>
            <select
              name="type"
              id="create-type"
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
              }}
            >
              <option value="telegram">{t.typeOptions.telegram}</option>
              <option value="whatsapp">{t.typeOptions.whatsapp}</option>
              <option value="web">{t.typeOptions.web}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-name">{t.nameLabel}</Label>
            <Input
              id="create-name"
              name="name"
              placeholder={namePlaceholder(type, t.namePlaceholders)}
              required
            />
          </div>

          {type === 'telegram' && <TelegramConfigFields />}
          {type === 'whatsapp' && <WhatsAppConfigFields />}
          {type === 'web' && <WebConfigFields />}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t.create.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t.create.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ //
//  Edit Channel Dialog                                                //
// ------------------------------------------------------------------ //

export function EditChannelDialog({
  channel,
  onOpenChange,
  saving,
  onSubmit,
}: {
  channel: ApiChannel | null;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSubmit: (id: string, form: FormData) => void;
}) {
  const t = useT(messages);

  if (!channel) return null;

  return (
    <Dialog open={channel !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.edit.title}</DialogTitle>
          <DialogDescription>{t.edit.description(channel.name)}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(channel.id, new FormData(e.currentTarget));
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">{t.nameLabel}</Label>
            <Input id="edit-name" name="name" defaultValue={channel.name} required />
          </div>

          {channel.type === 'telegram' && <TelegramConfigFields config={channel.config} />}
          {channel.type === 'whatsapp' && <WhatsAppConfigFields />}
          {channel.type === 'web' && <WebConfigFields config={channel.config} />}

          <ToolProgressField channelType={channel.type} defaultMode={channel.toolProgressMode} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t.edit.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t.edit.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ //
//  Channel-Type Config Field Components                               //
// ------------------------------------------------------------------ //

function namePlaceholder(
  type: string,
  labels: { telegram: string; whatsapp: string; web: string; fallback: string },
): string {
  switch (type) {
    case 'telegram':
      return labels.telegram;
    case 'whatsapp':
      return labels.whatsapp;
    case 'web':
      return labels.web;
    default:
      return labels.fallback;
  }
}

function TelegramConfigFields({ config = {} }: { config?: Record<string, unknown> }) {
  const t = useT(messages);
  const hasToken = typeof config['bot_token'] === 'string' && config['bot_token'].length > 0;
  const hasWebhookSecret =
    typeof config['webhook_secret'] === 'string' && config['webhook_secret'].length > 0;

  const [mode, setMode] = useState<string>((config['mode'] as string) ?? 'polling');

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cfg-bot_token">{t.telegram.botToken}</Label>
        <Input
          id="cfg-bot_token"
          name="bot_token"
          placeholder={
            hasToken ? t.telegram.botTokenSetPlaceholder : t.telegram.botTokenPlaceholder
          }
        />
        <p className="text-xs text-muted-foreground">
          {hasToken ? t.telegram.botTokenSetHelp : t.telegram.botTokenHelp}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cfg-mode">{t.telegram.mode}</Label>
        <select
          name="mode"
          id="cfg-mode"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
          }}
        >
          <option value="polling">{t.telegram.modePolling}</option>
          <option value="webhook">{t.telegram.modeWebhook}</option>
        </select>
      </div>
      {mode === 'webhook' && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cfg-webhook_url">{t.telegram.webhookUrl}</Label>
            <Input
              id="cfg-webhook_url"
              name="webhook_url"
              placeholder="https://your-domain.com/api/telegram/webhook"
              defaultValue={(config['webhook_url'] as string) ?? ''}
              required
            />
            <p className="text-xs text-muted-foreground">{t.telegram.webhookUrlHelp}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cfg-webhook_secret">{t.telegram.webhookSecret}</Label>
            <Input
              id="cfg-webhook_secret"
              name="webhook_secret"
              placeholder={
                hasWebhookSecret
                  ? t.telegram.webhookSecretSetPlaceholder
                  : t.telegram.webhookSecretPlaceholder
              }
            />
            <p className="text-xs text-muted-foreground">
              {hasWebhookSecret ? t.telegram.webhookSecretSetHelp : t.telegram.webhookSecretHelp}
            </p>
          </div>
        </>
      )}
    </>
  );
}

function WhatsAppConfigFields() {
  const t = useT(messages);
  return (
    <div className="rounded-md border border-muted bg-muted/30 px-3 py-3 text-xs leading-relaxed text-muted-foreground space-y-2">
      <p>{t.whatsapp.line1}</p>
      <p>
        {t.whatsapp.line2Pre}
        <span className="font-medium text-foreground">{t.whatsapp.line2Bold}</span>
        {t.whatsapp.line2Post}
      </p>
      <p>
        {t.whatsapp.line3Pre}
        <code className="font-mono text-[11px]">$WHATSAPP_AUTH_DIR</code>
        {t.whatsapp.line3Mid1}
        <code className="font-mono text-[11px]">data/whatsapp-auth/&lt;channelId&gt;</code>
        {t.whatsapp.line3Mid2}
        <code className="font-mono text-[11px]">whatsappJid</code>
        {t.whatsapp.line3Mid3}
        <code className="font-mono text-[11px]">15551234567@s.whatsapp.net</code>
        {t.whatsapp.line3Post}
      </p>
    </div>
  );
}

function WebConfigFields({ config = {} }: { config?: Record<string, unknown> }) {
  const t = useT(messages);
  return (
    <>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="cfg-enableProgress"
          name="enableProgress"
          className="size-4 rounded border"
          defaultChecked={config['enableProgress'] !== false}
        />
        <Label htmlFor="cfg-enableProgress">{t.web.enableProgress}</Label>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="cfg-enableToolHints"
          name="enableToolHints"
          className="size-4 rounded border"
          defaultChecked={config['enableToolHints'] !== false}
        />
        <Label htmlFor="cfg-enableToolHints">{t.web.enableToolHints}</Label>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ //
//  Tool Progress Field                                                //
// ------------------------------------------------------------------ //

function ToolProgressField({
  channelType,
  defaultMode,
}: {
  channelType: string;
  defaultMode: string | null;
}) {
  const t = useT(messages);
  const [mode, setMode] = useState<string>(defaultMode ?? 'default');
  const platformDefault = PLATFORM_DEFAULT_LABEL[channelType] ?? 'off';

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="edit-toolProgressMode">{t.toolProgress.label}</Label>
      <input type="hidden" name="toolProgressMode" value={mode === 'default' ? '' : mode} />
      <Select value={mode} onValueChange={setMode}>
        <SelectTrigger id="edit-toolProgressMode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">{t.toolProgress.default(platformDefault)}</SelectItem>
          <SelectItem value="off">{t.toolProgress.off}</SelectItem>
          <SelectItem value="new">{t.toolProgress.new}</SelectItem>
          <SelectItem value="all">{t.toolProgress.all}</SelectItem>
          <SelectItem value="verbose">{t.toolProgress.verbose}</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{t.toolProgress.help}</p>
    </div>
  );
}
