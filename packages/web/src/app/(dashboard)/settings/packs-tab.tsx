'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
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
import { authFetch } from '@/lib/auth';
import { useT, type Messages } from '@/lib/i18n';

// ------------------------------------------------------------------ //
//  Messages                                                           //
// ------------------------------------------------------------------ //

const messages = {
  en: {
    errors: {
      load: 'Failed to load packs',
      install: 'Failed to install pack',
      update: 'Failed to update pack',
    },
    columns: {
      pack: 'Pack',
      agents: 'Agents',
      status: 'Status',
      enabled: 'Enabled',
    },
    install: 'Install',
    status: {
      not_installed: 'Not installed',
      partial: 'Partial',
      active: 'Active',
      disabled: 'Disabled',
    },
  },
  'zh-TW': {
    errors: {
      load: '載入套件失敗',
      install: '安裝套件失敗',
      update: '更新套件失敗',
    },
    columns: {
      pack: '套件',
      agents: '代理',
      status: '狀態',
      enabled: '已啟用',
    },
    install: '安裝',
    status: {
      not_installed: '尚未安裝',
      partial: '部分安裝',
      active: '啟用中',
      disabled: '已停用',
    },
  },
} satisfies Messages<{
  errors: {
    load: string;
    install: string;
    update: string;
  };
  columns: {
    pack: string;
    agents: string;
    status: string;
    enabled: string;
  };
  install: string;
  status: {
    not_installed: string;
    partial: string;
    active: string;
    disabled: string;
  };
}>;

// ------------------------------------------------------------------ //
//  Types                                                              //
// ------------------------------------------------------------------ //

type PackStatus = 'not_installed' | 'partial' | 'active' | 'disabled';

interface ApiPackAgent {
  name: string;
  installed: boolean;
  isActive: boolean;
}

export interface ApiPack {
  id: string;
  name: string;
  description: string;
  totalAgents: number;
  installedCount: number;
  status: PackStatus;
  agents: ApiPackAgent[];
}

const statusVariant: Record<PackStatus, 'default' | 'outline' | 'secondary'> = {
  not_installed: 'outline',
  partial: 'secondary',
  active: 'default',
  disabled: 'secondary',
};

// ------------------------------------------------------------------ //
//  Component                                                          //
// ------------------------------------------------------------------ //

export function PacksTab() {
  const [packs, setPacks] = useState<ApiPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const t = useT(messages);

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch<ApiPack[]>('/admin/packs');
      setPacks(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.load);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchPacks();
  }, [fetchPacks]);

  async function handleInstall(packId: string) {
    setSaving(true);
    setError('');
    try {
      await authFetch(`/admin/packs/${packId}/install`, { method: 'POST' });
      await fetchPacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.install);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(pack: ApiPack) {
    setSaving(true);
    setError('');
    try {
      const enabled = !pack.agents.some((a) => a.isActive);
      await authFetch(`/admin/packs/${pack.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
      await fetchPacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.update);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border bg-background/30 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.pack}</TableHead>
                <TableHead>{t.columns.agents}</TableHead>
                <TableHead>{t.columns.status}</TableHead>
                <TableHead className="w-[160px]">{t.columns.enabled}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.map((p) => {
                const fullyInstalled = p.status === 'active' || p.status === 'disabled';
                const anyActive = p.agents.some((a) => a.isActive);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="size-4" />
                        {p.name}
                      </div>
                      <span className="text-xs text-muted-foreground">{p.description}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.installedCount} / {p.totalAgents}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[p.status]}>{t.status[p.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {!fullyInstalled && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => {
                              void handleInstall(p.id);
                            }}
                          >
                            {t.install}
                          </Button>
                        )}
                        {p.installedCount > 0 && (
                          <Switch
                            checked={anyActive}
                            onCheckedChange={() => {
                              void handleToggle(p);
                            }}
                            disabled={saving}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
