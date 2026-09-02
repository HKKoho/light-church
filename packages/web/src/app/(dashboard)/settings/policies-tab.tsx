'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MoreHorizontal, Plus, Shield } from 'lucide-react';
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
  DropdownMenuSeparator,
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
import { CreatePolicyDialog, EditPolicyDialog } from './policies-dialogs';

// ------------------------------------------------------------------ //
//  i18n                                                               //
// ------------------------------------------------------------------ //

const messages = {
  en: {
    unlimited: 'Unlimited',
    createPolicy: 'Create Policy',
    emptyState: 'No policies configured. Click "Create Policy" to get started.',
    columns: {
      policy: 'Policy',
      tokenBudget: 'Token Budget',
      agents: 'Agents',
      providers: 'Providers',
      active: 'Active',
    },
    noneProviders: 'None',
    actions: {
      edit: 'Edit',
      delete: 'Delete',
    },
    deleteDialog: {
      title: 'Delete Policy',
      description: (name: string) =>
        `Are you sure you want to delete ${name}? Users assigned to this policy must be reassigned first.`,
      cancel: 'Cancel',
      confirm: 'Delete',
    },
    successTitle: 'Policy Created',
    createdMessage: (name: string) => `${name} has been created.`,
    defaultPolicyName: 'Policy',
    errors: {
      load: 'Failed to load policies',
      create: 'Failed to create policy',
      update: 'Failed to update policy',
      delete: 'Failed to delete policy',
    },
  },
  'zh-TW': {
    unlimited: '無限制',
    createPolicy: '建立政策',
    emptyState: '尚未設定任何政策。點選「建立政策」開始使用。',
    columns: {
      policy: '政策',
      tokenBudget: 'Token 預算',
      agents: '代理',
      providers: '供應商',
      active: '啟用中',
    },
    noneProviders: '無',
    actions: {
      edit: '編輯',
      delete: '刪除',
    },
    deleteDialog: {
      title: '刪除政策',
      description: (name: string) => `確定要刪除 ${name} 嗎？必須先重新指派使用此政策的使用者。`,
      cancel: '取消',
      confirm: '刪除',
    },
    successTitle: '政策已建立',
    createdMessage: (name: string) => `${name} 已建立。`,
    defaultPolicyName: '政策',
    errors: {
      load: '無法載入政策',
      create: '無法建立政策',
      update: '無法更新政策',
      delete: '無法刪除政策',
    },
  },
} satisfies Messages<{
  unlimited: string;
  createPolicy: string;
  emptyState: string;
  columns: {
    policy: string;
    tokenBudget: string;
    agents: string;
    providers: string;
    active: string;
  };
  noneProviders: string;
  actions: {
    edit: string;
    delete: string;
  };
  deleteDialog: {
    title: string;
    description: (name: string) => string;
    cancel: string;
    confirm: string;
  };
  successTitle: string;
  createdMessage: (name: string) => string;
  defaultPolicyName: string;
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

export interface ApiPolicy {
  id: string;
  name: string;
  description: string | null;
  maxTokenBudget: number | null;
  maxAgents: number;
  maxSkills: number;
  maxMemoryItems: number;
  maxGroupsOwned: number;
  allowedProviders: string[];
  cronEnabled: boolean;
  maxScheduledTasks: number;
  minCronIntervalSecs: number;
  maxTokensPerCronRun: number | null;
  features: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

interface PaginatedPolicies {
  data: ApiPolicy[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface ApiProvider {
  provider: string;
  displayName: string;
}

// ------------------------------------------------------------------ //
//  Helpers                                                            //
// ------------------------------------------------------------------ //

function formatBudget(cents: number | null, unlimitedLabel: string): string {
  if (cents === null) return unlimitedLabel;
  return `$${(cents / 100).toFixed(2)}/mo`;
}

// ------------------------------------------------------------------ //
//  Component                                                          //
// ------------------------------------------------------------------ //

export function PoliciesTab() {
  const t = useT(messages);
  const [policies, setPolicies] = useState<ApiPolicy[]>([]);
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<ApiPolicy | null>(null);
  const [deletePolicy, setDeletePolicy] = useState<ApiPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [policiesRes, providersRes] = await Promise.all([
        authFetch<PaginatedPolicies>('/admin/policies?limit=100'),
        authFetch<ApiProvider[]>('/admin/providers'),
      ]);
      setPolicies(Array.isArray(policiesRes.data) ? policiesRes.data : []);
      const nameMap: Record<string, string> = {};
      for (const p of providersRes ?? []) {
        nameMap[p.provider] = p.displayName;
      }
      setProviderNames(nameMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.load);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleCreate(data: Record<string, unknown>) {
    setSaving(true);
    setError('');
    try {
      await authFetch('/admin/policies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setCreateOpen(false);
      await fetchData();
      setSuccessMessage(t.createdMessage((data as { name?: string }).name ?? t.defaultPolicyName));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.create);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(policy: ApiPolicy) {
    setSaving(true);
    setError('');
    try {
      await authFetch(`/admin/policies/${policy.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !policy.isActive }),
      });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.update);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, data: Record<string, unknown>) {
    setSaving(true);
    setError('');
    try {
      await authFetch(`/admin/policies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setEditPolicy(null);
      await fetchData();
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
      await authFetch(`/admin/policies/${id}`, { method: 'DELETE' });
      setDeletePolicy(null);
      await fetchData();
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
          {t.createPolicy}
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
      ) : policies.length === 0 ? (
        <div className="rounded-md border bg-background/30 backdrop-blur-sm p-8 text-center text-sm text-muted-foreground">
          {t.emptyState}
        </div>
      ) : (
        <div className="rounded-md border bg-background/30 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.policy}</TableHead>
                <TableHead>{t.columns.tokenBudget}</TableHead>
                <TableHead>{t.columns.agents}</TableHead>
                <TableHead>{t.columns.providers}</TableHead>
                <TableHead>{t.columns.active}</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4" />
                      {p.name}
                    </div>
                    {p.description && (
                      <span className="text-xs text-muted-foreground">{p.description}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-1 text-xs">
                      {formatBudget(p.maxTokenBudget, t.unlimited)}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm">{p.maxAgents}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const configured = p.allowedProviders.filter(
                          (prov) => prov in providerNames,
                        );
                        return configured.length > 0 ? (
                          configured.map((prov) => (
                            <Badge key={prov} variant="outline" className="text-xs">
                              {providerNames[prov]}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">{t.noneProviders}</span>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.isActive}
                      onCheckedChange={() => {
                        void handleToggleActive(p);
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
                            setEditPolicy(p);
                          }}
                        >
                          {t.actions.edit}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => {
                            setDeletePolicy(p);
                          }}
                        >
                          {t.actions.delete}
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

      <CreatePolicyDialog
        key={createOpen ? 'create-open' : 'create-closed'}
        open={createOpen}
        onOpenChange={setCreateOpen}
        saving={saving}
        onSubmit={handleCreate}
      />

      <EditPolicyDialog
        key={editPolicy?.id ?? 'none'}
        policy={editPolicy}
        onOpenChange={(open) => {
          if (!open) setEditPolicy(null);
        }}
        saving={saving}
        onSubmit={handleUpdate}
      />

      <AlertDialog
        open={deletePolicy !== null}
        onOpenChange={(open) => {
          if (!open) setDeletePolicy(null);
        }}
      >
        {deletePolicy && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.deleteDialog.description(deletePolicy.name)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.deleteDialog.cancel}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  void handleDelete(deletePolicy.id);
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
