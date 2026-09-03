'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Loader2, MoreHorizontal, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useT, type Messages } from '@/lib/i18n';

// ------------------------------------------------------------------ //
//  Messages                                                           //
// ------------------------------------------------------------------ //

const messages = {
  en: {
    intro:
      'Headless API accounts. Each client logs in over HTTP/WebSocket and is scoped to its own data by JWT — no dashboard access.',
    addClient: 'Add Client',
    columns: {
      name: 'Name',
      email: 'Email',
      policy: 'Policy',
      agent: 'Agent',
      status: 'Status',
      created: 'Created',
    },
    status: { active: 'active', inactive: 'inactive' },
    empty: 'No API clients yet. Click "Add Client" to create one.',
    actions: { deactivate: 'Deactivate', activate: 'Activate', remove: 'Remove' },
    createDialog: {
      title: 'Add API Client',
      description:
        'Creates the user, its policy binding, and its required primary agent in one step.',
      name: 'Name',
      email: 'Email',
      password: 'Password',
      policy: 'Policy',
      agent: 'Primary Agent',
      selectAgent: 'Select an agent...',
      help: 'Clients must be bound to a primary agent — this is what they chat with over the API.',
      cancel: 'Cancel',
      submit: 'Create',
    },
    deleteDialog: {
      title: 'Remove API Client',
      confirm: (name: string, email: string) =>
        `Are you sure you want to remove ${name} (${email})? This action cannot be undone.`,
      cancel: 'Cancel',
      remove: 'Remove',
    },
    errors: { load: 'Failed to load API clients', create: 'Failed to create API client' },
  },
  'zh-TW': {
    intro:
      '無頭 API 帳戶。每個用戶端透過 HTTP／WebSocket 登入，並以 JWT 限定在自己的資料範圍內 — 無儀表板存取權限。',
    addClient: '新增用戶端',
    columns: {
      name: '名稱',
      email: '電子郵件',
      policy: '政策',
      agent: '代理',
      status: '狀態',
      created: '建立時間',
    },
    status: { active: '啟用中', inactive: '未啟用' },
    empty: '尚無 API 用戶端。點擊「新增用戶端」建立一個。',
    actions: { deactivate: '停用', activate: '啟用', remove: '移除' },
    createDialog: {
      title: '新增 API 用戶端',
      description: '一次完成建立使用者、其政策綁定與必要的主要代理。',
      name: '名稱',
      email: '電子郵件',
      password: '密碼',
      policy: '政策',
      agent: '主要代理',
      selectAgent: '選擇代理…',
      help: '用戶端必須綁定主要代理 — 這是它們透過 API 對話的對象。',
      cancel: '取消',
      submit: '建立',
    },
    deleteDialog: {
      title: '移除 API 用戶端',
      confirm: (name: string, email: string) =>
        `確定要移除 ${name}（${email}）嗎？此操作無法復原。`,
      cancel: '取消',
      remove: '移除',
    },
    errors: { load: '載入 API 用戶端失敗', create: '建立 API 用戶端失敗' },
  },
} satisfies Messages<{
  intro: string;
  addClient: string;
  columns: {
    name: string;
    email: string;
    policy: string;
    agent: string;
    status: string;
    created: string;
  };
  status: { active: string; inactive: string };
  empty: string;
  actions: { deactivate: string; activate: string; remove: string };
  createDialog: {
    title: string;
    description: string;
    name: string;
    email: string;
    password: string;
    policy: string;
    agent: string;
    selectAgent: string;
    help: string;
    cancel: string;
    submit: string;
  };
  deleteDialog: {
    title: string;
    confirm: (name: string, email: string) => string;
    cancel: string;
    remove: string;
  };
  errors: { load: string; create: string };
}>;

// ------------------------------------------------------------------ //
//  Types                                                              //
// ------------------------------------------------------------------ //

interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  policyId: string;
  isActive: boolean;
  createdAt: string;
}

interface ApiPolicy {
  id: string;
  name: string;
  isActive: boolean;
}

interface PaginatedUsers {
  data: ApiUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface PaginatedPolicies {
  data: ApiPolicy[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ------------------------------------------------------------------ //
//  Component                                                          //
// ------------------------------------------------------------------ //

export function ApiClientsTab() {
  const t = useT(messages);

  const [clients, setClients] = useState<ApiUser[]>([]);
  const [policies, setPolicies] = useState<ApiPolicy[]>([]);
  const [agentDefs, setAgentDefs] = useState<{ id: string; name: string }[]>([]);
  const [userAgentMap, setUserAgentMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteClient, setDeleteClient] = useState<ApiUser | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, policiesRes, agentsRes, userAgentsRes] = await Promise.all([
        authFetch<PaginatedUsers>('/admin/users?limit=100'),
        authFetch<PaginatedPolicies>('/admin/policies?limit=100'),
        authFetch<{ data: { id: string; name: string; role: string; isActive: boolean }[] }>(
          '/api/v1/agents?role=primary&limit=100',
        ),
        authFetch<{ id: string; userId: string; agentDefinitionId: string }[]>(
          '/api/v1/agents/user-agents',
        ),
      ]);
      setClients(
        Array.isArray(usersRes.data) ? usersRes.data.filter((u) => u.role === 'client') : [],
      );
      setPolicies(Array.isArray(policiesRes.data) ? policiesRes.data : []);
      setAgentDefs(
        Array.isArray(agentsRes.data)
          ? agentsRes.data.filter((a) => a.isActive).map((a) => ({ id: a.id, name: a.name }))
          : [],
      );
      const map = new Map<string, string>();
      for (const ua of userAgentsRes) {
        map.set(ua.userId, ua.agentDefinitionId);
      }
      setUserAgentMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.load);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleCreate(form: FormData) {
    setSaving(true);
    setError('');
    try {
      await authFetch('/admin/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
          policyId: form.get('policyId'),
          agentDefinitionId: form.get('agentDefinitionId'),
        }),
      });
      setCreateOpen(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.create);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(client: ApiUser) {
    setSaving(true);
    setError('');
    try {
      await authFetch(`/admin/users/${client.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !client.isActive }),
      });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.load);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setError('');
    try {
      await authFetch(`/admin/users/${id}`, { method: 'DELETE' });
      setDeleteClient(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.load);
    } finally {
      setSaving(false);
    }
  }

  const agentName = useMemo(
    () => (client: ApiUser) => {
      const agentDefId = userAgentMap.get(client.id);
      return agentDefs.find((a) => a.id === agentDefId)?.name ?? '—';
    },
    [userAgentMap, agentDefs],
  );

  const policyName = useMemo(
    () => (policyId: string) => policies.find((p) => p.id === policyId)?.name ?? '—',
    [policies],
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t.intro}</p>
        <Button
          size="sm"
          onClick={() => {
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-1 size-4" />
          {t.addClient}
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
      ) : clients.length === 0 ? (
        <div className="rounded-md border bg-background/30 backdrop-blur-sm p-8 text-center text-sm text-muted-foreground">
          {t.empty}
        </div>
      ) : (
        <div className="rounded-md border bg-background/30 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.name}</TableHead>
                <TableHead>{t.columns.email}</TableHead>
                <TableHead>{t.columns.policy}</TableHead>
                <TableHead>{t.columns.agent}</TableHead>
                <TableHead>{t.columns.status}</TableHead>
                <TableHead>{t.columns.created}</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">{client.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{policyName(client.policyId)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{agentName(client)}</TableCell>
                  <TableCell>
                    <Badge variant={client.isActive ? 'secondary' : 'outline'}>
                      {client.isActive ? t.status.active : t.status.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(client.createdAt).toLocaleDateString()}
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
                            void handleToggleActive(client);
                          }}
                        >
                          {client.isActive ? t.actions.deactivate : t.actions.activate}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => {
                            setDeleteClient(client);
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

      {/* ---- Add Client Dialog ---- */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.createDialog.title}</DialogTitle>
            <DialogDescription>{t.createDialog.description}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreate(new FormData(e.currentTarget));
            }}
            className="flex flex-col gap-4"
            autoComplete="off"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-name">{t.createDialog.name}</Label>
              <Input id="client-name" name="name" required autoComplete="off" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-email">{t.createDialog.email}</Label>
              <Input id="client-email" name="email" type="email" required autoComplete="off" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-password">{t.createDialog.password}</Label>
              <div className="relative">
                <Input
                  id="client-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setShowPassword((v) => !v);
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-policy">{t.createDialog.policy}</Label>
              <select
                name="policyId"
                id="client-policy"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue={
                  policies.find((p) => p.name === 'Standard')?.id ?? policies[0]?.id ?? ''
                }
              >
                {policies
                  .filter((p) => p.isActive)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-agent">{t.createDialog.agent}</Label>
              <select
                name="agentDefinitionId"
                id="client-agent"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue=""
                required
              >
                <option value="">{t.createDialog.selectAgent}</option>
                {agentDefs.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{t.createDialog.help}</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                }}
              >
                {t.createDialog.cancel}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t.createDialog.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Client Confirm ---- */}
      <AlertDialog
        open={deleteClient !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteClient(null);
        }}
      >
        {deleteClient && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.deleteDialog.confirm(deleteClient.name, deleteClient.email)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.deleteDialog.cancel}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  void handleDelete(deleteClient.id);
                }}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t.deleteDialog.remove}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  );
}
