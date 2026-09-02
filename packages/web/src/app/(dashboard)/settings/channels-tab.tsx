'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  MoreHorizontal,
  Plus,
  Radio,
  MessageSquare,
  MessageCircle,
  Globe,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { authFetch } from '@/lib/auth';
import { SuccessDialog } from '@/components/ui/success-dialog';
import { useT, type Messages } from '@/lib/i18n';
import { CreateChannelDialog, EditChannelDialog } from './channels-dialogs';

// ------------------------------------------------------------------ //
//  i18n                                                               //
// ------------------------------------------------------------------ //

const messages = {
  en: {
    addChannel: 'Add Channel',
    emptyState: 'No channels configured. Click "Add Channel" to get started.',
    columns: {
      channel: 'Channel',
      type: 'Type',
      status: 'Status',
      enabled: 'Enabled',
    },
    status: {
      connected: 'connected',
      disconnected: 'disconnected',
      disabled: 'disabled',
    },
    actions: {
      configure: 'Configure',
      remove: 'Remove',
    },
    deleteDialog: {
      title: 'Remove Channel',
      description: (name: string) =>
        `Are you sure you want to remove ${name}? This will disconnect the channel and remove its configuration.`,
      cancel: 'Cancel',
      confirm: 'Remove',
    },
    successTitle: 'Channel Added',
    addedMessage: (name: string) => `${name} has been added.`,
    errors: {
      load: 'Failed to load channels',
      create: 'Failed to create channel',
      update: 'Failed to update channel',
      delete: 'Failed to delete channel',
    },
  },
  'zh-TW': {
    addChannel: '新增頻道',
    emptyState: '尚未設定任何頻道。點選「新增頻道」開始使用。',
    columns: {
      channel: '頻道',
      type: '類型',
      status: '狀態',
      enabled: '已啟用',
    },
    status: {
      connected: '已連線',
      disconnected: '已斷線',
      disabled: '已停用',
    },
    actions: {
      configure: '設定',
      remove: '移除',
    },
    deleteDialog: {
      title: '移除頻道',
      description: (name: string) => `確定要移除 ${name} 嗎？這將中斷此頻道的連線並移除其設定。`,
      cancel: '取消',
      confirm: '移除',
    },
    successTitle: '頻道已新增',
    addedMessage: (name: string) => `${name} 已新增。`,
    errors: {
      load: '無法載入頻道',
      create: '無法建立頻道',
      update: '無法更新頻道',
      delete: '無法刪除頻道',
    },
  },
} satisfies Messages<{
  addChannel: string;
  emptyState: string;
  columns: {
    channel: string;
    type: string;
    status: string;
    enabled: string;
  };
  status: {
    connected: string;
    disconnected: string;
    disabled: string;
  };
  actions: {
    configure: string;
    remove: string;
  };
  deleteDialog: {
    title: string;
    description: (name: string) => string;
    cancel: string;
    confirm: string;
  };
  successTitle: string;
  addedMessage: (name: string) => string;
  errors: {
    load: string;
    create: string;
    update: string;
    delete: string;
  };
}>;

// ------------------------------------------------------------------ //
//  Types (exported for use in dialogs)                                //
// ------------------------------------------------------------------ //

export interface ApiChannel {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  toolProgressMode: string | null;
  createdAt: string;
}

interface PaginatedChannels {
  data: ApiChannel[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ------------------------------------------------------------------ //
//  Helpers                                                            //
// ------------------------------------------------------------------ //

const channelIcons: Record<string, typeof Radio> = {
  telegram: MessageSquare,
  whatsapp: MessageCircle,
  web: Globe,
};

function ChannelIcon({ type }: { type: string }) {
  const Icon = channelIcons[type] ?? Radio;
  return <Icon className="size-4" />;
}

/**
 * Build a config object from form data, merging with existing config.
 * Blank sensitive fields (e.g. bot token) are omitted to preserve existing values.
 */
function buildConfig(
  type: string,
  form: FormData,
  existing: Record<string, unknown> = {},
): Record<string, unknown> {
  const config = { ...existing };

  if (type === 'telegram') {
    const botToken = form.get('bot_token') as string;
    const mode = form.get('mode') as string;
    if (botToken) config['bot_token'] = botToken;
    if (mode) config['mode'] = mode;
  }

  if (type === 'web') {
    config['enableProgress'] = form.get('enableProgress') === 'on';
    config['enableToolHints'] = form.get('enableToolHints') === 'on';
  }

  return config;
}

// ------------------------------------------------------------------ //
//  Component                                                          //
// ------------------------------------------------------------------ //

export function ChannelsTab() {
  const t = useT(messages);
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editChannel, setEditChannel] = useState<ApiChannel | null>(null);
  const [deleteChannel, setDeleteChannel] = useState<ApiChannel | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [res, status] = await Promise.all([
        authFetch<PaginatedChannels>('/admin/channels?limit=100'),
        authFetch<{ connectedIds: string[] }>('/admin/channels/status'),
      ]);
      setChannels(Array.isArray(res.data) ? res.data : []);
      setConnectedIds(new Set(status.connectedIds ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.load);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchChannels();
  }, [fetchChannels]);

  async function handleCreate(form: FormData) {
    setSaving(true);
    setError('');
    try {
      const type = form.get('type') as string;
      await authFetch('/admin/channels', {
        method: 'POST',
        body: JSON.stringify({
          type,
          name: form.get('name'),
          config: buildConfig(type, form),
        }),
      });
      setCreateOpen(false);
      await fetchChannels();
      setSuccessMessage(t.addedMessage(String(form.get('name') ?? '')));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.create);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(channel: ApiChannel) {
    setSaving(true);
    setError('');
    try {
      await authFetch(`/admin/channels/${channel.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !channel.isActive }),
      });
      await fetchChannels();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.update);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, form: FormData) {
    setSaving(true);
    setError('');
    try {
      const channel = channels.find((ch) => ch.id === id);
      const config = buildConfig(channel?.type ?? '', form, channel?.config ?? {});
      const toolProgressRaw = form.get('toolProgressMode');
      const toolProgressMode =
        typeof toolProgressRaw === 'string' && toolProgressRaw !== '' ? toolProgressRaw : null;
      await authFetch(`/admin/channels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: form.get('name'), config, toolProgressMode }),
      });
      setEditChannel(null);
      await fetchChannels();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.update);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setError('');
    try {
      await authFetch(`/admin/channels/${id}`, { method: 'DELETE' });
      setDeleteChannel(null);
      await fetchChannels();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.delete);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Button
          size="sm"
          onClick={() => {
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-1 size-4" />
          {t.addChannel}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-md border bg-background/30 backdrop-blur-sm p-8 text-center text-sm text-muted-foreground">
          {t.emptyState}
        </div>
      ) : (
        <div className="rounded-md border bg-background/30 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.channel}</TableHead>
                <TableHead>{t.columns.type}</TableHead>
                <TableHead>{t.columns.status}</TableHead>
                <TableHead>{t.columns.enabled}</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ChannelIcon type={channel.type} />
                      {channel.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {channel.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {channel.isActive ? (
                      connectedIds.has(channel.id) ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-500/15 text-green-600 border-green-500/30"
                        >
                          {t.status.connected}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">{t.status.disconnected}</Badge>
                      )
                    ) : (
                      <Badge variant="outline">{t.status.disabled}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={channel.isActive}
                      onCheckedChange={() => {
                        void handleToggleActive(channel);
                      }}
                      disabled={saving}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditChannel(channel);
                          }}
                        >
                          {t.actions.configure}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => {
                            setDeleteChannel(channel);
                          }}
                        >
                          {t.actions.remove}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateChannelDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        saving={saving}
        onSubmit={handleCreate}
      />

      <EditChannelDialog
        channel={editChannel}
        onOpenChange={(open) => {
          if (!open) setEditChannel(null);
        }}
        saving={saving}
        onSubmit={handleUpdate}
      />

      <AlertDialog
        open={deleteChannel !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteChannel(null);
        }}
      >
        {deleteChannel && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.deleteDialog.description(deleteChannel.name)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.deleteDialog.cancel}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  void handleDelete(deleteChannel.id);
                }}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t.deleteDialog.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <SuccessDialog
        open={successMessage !== ''}
        onOpenChange={(open) => {
          if (!open) setSuccessMessage('');
        }}
        title={t.successTitle}
        description={successMessage}
      />
    </>
  );
}
