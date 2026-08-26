'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  EyeIcon,
  EyeOff,
  Loader2,
  Minus,
  MoreHorizontal,
  Plus,
  Shield,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAnimeOnMount, staggerFadeUp, STAGGER } from '@/lib/anime';
import { useT, type Messages } from '@/lib/i18n';
import { GroupsTab } from '../groups-tab';
import { ApiClientsTab } from '../api-clients-tab';

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

// Highest to lowest privilege. `super_admin` is the only system-admin-equivalent role
// (user management, provider config, the admin-only workspace folders); senior_pastor
// and pastor see every department's workspace folders but aren't system admins;
// everyone else is scoped to their own `department` (default `all` = unrestricted).
const ROLE_ORDER = [
  'super_admin',
  'senior_pastor',
  'pastor',
  'admin_staff',
  'ministry_leader',
  'volunteer',
  'guest',
] as const;
type RoleKey = (typeof ROLE_ORDER)[number];

const DEPARTMENT_ORDER = [
  'all',
  'program_coordination',
  'donor_engagement',
  'monitoring_evaluation',
  'communications',
  'field_operations',
  'pastoral_care',
  'finance',
  'outreach',
  'scripture_literacy',
] as const;
type DepartmentKey = (typeof DEPARTMENT_ORDER)[number];

// A role with no run-agent access — mirrors the old 'viewer' special-case (skip agent
// assignment during signup, disable the primary-agent picker in the edit dialog).
const READ_ONLY_ROLE: RoleKey = 'guest';

interface PaginatedUsers {
  data: ApiUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface ApiPolicy {
  id: string;
  name: string;
  isActive: boolean;
}

interface PaginatedPolicies {
  data: ApiPolicy[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ------------------------------------------------------------------ //
//  Helpers                                                            //
// ------------------------------------------------------------------ //

function roleVariant(role: string) {
  switch (role as RoleKey) {
    case 'super_admin':
      return 'default' as const;
    case 'senior_pastor':
    case 'pastor':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

// ------------------------------------------------------------------ //
//  Roles tab data (static — roles are enum-based)                     //
// ------------------------------------------------------------------ //

interface Permission {
  key: string;
  // Roles not listed default to false — only list which roles are allowed.
  allowed: ReadonlySet<RoleKey>;
}

interface PermissionGroup {
  categoryKey: string;
  permissions: Permission[];
}

// system_admin_only: matches the @Roles(UserRole.super_admin) guard exactly
// (admin/agents/provider-config controllers) — nothing else grants these.
const SYSTEM_ADMIN_ONLY = new Set<RoleKey>(['super_admin']);
// cross_department: super_admin + the two roles that see every department's
// workspace folders (assertPathAllowed's CROSS_DEPARTMENT_ROLES).
const CROSS_DEPARTMENT = new Set<RoleKey>(['super_admin', 'senior_pastor', 'pastor']);
// operational: everyone who isn't read-only-by-default (guest).
const OPERATIONAL = new Set<RoleKey>([
  'super_admin',
  'senior_pastor',
  'pastor',
  'admin_staff',
  'ministry_leader',
  'volunteer',
]);
const EVERYONE = new Set<RoleKey>(ROLE_ORDER);
const ELEVATED = new Set<RoleKey>(['super_admin', 'senior_pastor', 'pastor', 'admin_staff', 'ministry_leader']);

const permissionMatrix: PermissionGroup[] = [
  {
    categoryKey: 'agents',
    permissions: [
      { key: 'viewAgentDefs', allowed: EVERYONE },
      { key: 'createEditAgent', allowed: ELEVATED },
      { key: 'deleteAgent', allowed: CROSS_DEPARTMENT },
      { key: 'runAgent', allowed: OPERATIONAL },
    ],
  },
  {
    categoryKey: 'skills',
    permissions: [
      { key: 'browseMarketplace', allowed: EVERYONE },
      { key: 'submitSkill', allowed: ELEVATED },
      { key: 'approveSkill', allowed: CROSS_DEPARTMENT },
    ],
  },
  {
    categoryKey: 'governance',
    permissions: [
      { key: 'viewTokenOrg', allowed: CROSS_DEPARTMENT },
      { key: 'viewTokenOwn', allowed: EVERYONE },
      { key: 'setBudgetAlerts', allowed: SYSTEM_ADMIN_ONLY },
      { key: 'viewAuditLogs', allowed: EVERYONE },
      { key: 'exportAuditLogs', allowed: SYSTEM_ADMIN_ONLY },
    ],
  },
  {
    categoryKey: 'administration',
    permissions: [
      { key: 'manageUsers', allowed: SYSTEM_ADMIN_ONLY },
      { key: 'assignRoles', allowed: SYSTEM_ADMIN_ONLY },
      { key: 'managePolicies', allowed: SYSTEM_ADMIN_ONLY },
      { key: 'configureProviders', allowed: SYSTEM_ADMIN_ONLY },
      { key: 'orgSettings', allowed: SYSTEM_ADMIN_ONLY },
      { key: 'manageGroups', allowed: ELEVATED },
    ],
  },
];

const roleIcons: Record<RoleKey, typeof ShieldCheck> = {
  super_admin: ShieldCheck,
  senior_pastor: ShieldCheck,
  pastor: Shield,
  admin_staff: Shield,
  ministry_leader: Shield,
  volunteer: Eye,
  guest: Eye,
};

// ------------------------------------------------------------------ //
//  Users Page                                                         //
// ------------------------------------------------------------------ //

type SortKey = 'name' | 'email' | 'role' | 'plan' | 'status';
type SortDir = 'asc' | 'desc';
interface SortEntry {
  key: SortKey;
  dir: SortDir;
}

function parseSorts(param: string | null): SortEntry[] {
  if (!param) return [{ key: 'role', dir: 'asc' }]; // default sort
  return param
    .split(',')
    .map((s) => {
      const [key, dir] = s.split(':') as [string, string];
      return { key: key as SortKey, dir: (dir === 'desc' ? 'desc' : 'asc') as SortDir };
    })
    .filter((s) => ['name', 'email', 'role', 'plan', 'status'].includes(s.key));
}

function serializeSorts(sorts: SortEntry[]): string {
  return sorts.map((s) => `${s.key}:${s.dir}`).join(',');
}

// ------------------------------------------------------------------ //
//  i18n dictionary (co-located)                                       //
// ------------------------------------------------------------------ //

const messages = {
  en: {
    title: 'User Management',
    subtitle: 'Manage users, roles, and groups.',
    tabs: {
      users: 'Users',
      roles: 'Roles',
      groups: 'Groups',
      clients: 'API Clients',
    },
    createUser: 'Create User',
    table: {
      name: 'Name',
      email: 'Email',
      role: 'Role',
      policy: 'Policy',
      status: 'Status',
      empty: 'No users found.',
      active: 'active',
      inactive: 'inactive',
    },
    rowActions: {
      edit: 'Edit',
      remove: 'Remove',
    },
    roleLabels: {
      super_admin: 'Super Admin',
      senior_pastor: 'Senior Pastor',
      pastor: 'Pastor',
      admin_staff: 'Admin Staff',
      ministry_leader: 'Ministry Leader',
      volunteer: 'Volunteer',
      guest: 'Guest',
    },
    roleDescriptions: {
      super_admin:
        'Full platform control: org settings, user management, RBAC, agent lifecycle, channel config, skill approval, providers, system health.',
      senior_pastor:
        'Sees every department’s workspace folders and can approve/delete agents and skills, but does not manage system settings.',
      pastor:
        'Same cross-department visibility as Senior Pastor; scoped to ministry oversight rather than platform administration.',
      admin_staff:
        'Build & operate: create agents, write skills, run agents, schedule tasks, monitor usage, manage channels, SDK integration.',
      ministry_leader:
        'Operates within their own department’s workspace folders: creates and runs agents, submits skills, manages that department’s content.',
      volunteer: 'Runs agents and views content within their own department. Cannot create or edit agents.',
      guest: 'Read-only: dashboards, audit logs, token reports.',
    },
    departmentLabels: {
      all: 'All departments',
      program_coordination: 'Program Coordination',
      donor_engagement: 'Donor Engagement',
      monitoring_evaluation: 'Monitoring & Evaluation',
      communications: 'Communications',
      field_operations: 'Field Operations',
      pastoral_care: 'Pastoral Care',
      finance: 'Finance',
      outreach: 'Outreach',
      scripture_literacy: 'Scripture & Literacy',
    },
    userCount: (n: number) => `${n} user${n !== 1 ? 's' : ''}`,
    matrix: {
      heading: 'Permission Matrix',
      permission: 'Permission',
      footnote: "Roles are system-defined. Contact your administrator to change a user's role.",
      allowed: 'Allowed',
      notAllowed: 'Not allowed',
    },
    categories: {
      agents: 'Agents',
      skills: 'Skills',
      governance: 'Governance',
      administration: 'Administration',
    },
    permissions: {
      viewAgentDefs: 'View agent definitions',
      createEditAgent: 'Create / edit agent',
      deleteAgent: 'Delete agent',
      runAgent: 'Run agent',
      browseMarketplace: 'Browse marketplace',
      submitSkill: 'Submit skill',
      approveSkill: 'Approve / reject skill',
      viewTokenOrg: 'View token usage (org-wide)',
      viewTokenOwn: 'View token usage (own)',
      setBudgetAlerts: 'Set budget alerts',
      viewAuditLogs: 'View audit logs',
      exportAuditLogs: 'Export audit logs',
      manageUsers: 'Manage users',
      assignRoles: 'Assign roles',
      managePolicies: 'Manage policies',
      configureProviders: 'Configure providers',
      orgSettings: 'Org settings',
      manageGroups: 'Manage groups',
    },
    createDialog: {
      title: 'Create User',
      description: 'Add a new user to the platform.',
      name: 'Name',
      email: 'Email',
      password: 'Password',
      role: 'Role',
      department: 'Department',
      policy: 'Policy',
      cancel: 'Cancel',
      submit: 'Create',
    },
    assignStep: {
      heading: 'User Created',
      added: (name: string) => `${name} has been added to the platform.`,
      assignAgent: 'Assign Primary Agent',
      selectAgent: 'Select an agent...',
      help: 'Assign a primary agent so this user can start conversations.',
      skip: 'Skip',
      assign: 'Assign',
    },
    doneStep: {
      heading: 'All Set!',
      createdReadOnly: (name: string) => `${name} has been created with read-only access.`,
      createdAgent: (name: string) => `${name} has been created and assigned a primary agent.`,
      done: 'Done',
    },
    editDialog: {
      title: 'Edit User',
      description: (name: string) => `Update ${name}'s profile.`,
      name: 'Name',
      role: 'Role',
      department: 'Department',
      policy: 'Policy',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      primaryAgent: 'Primary Agent',
      noAgent: 'No agent assigned',
      readOnlyHelp: 'Guests cannot run agents.',
      agentHelp: 'The primary agent allows this user to start conversations.',
      cancel: 'Cancel',
      save: 'Save',
    },
    deleteDialog: {
      title: 'Remove User',
      confirm: (name: string, email: string) =>
        `Are you sure you want to remove ${name} (${email})? This action cannot be undone.`,
      cancel: 'Cancel',
      remove: 'Remove',
    },
    errors: {
      load: 'Failed to load data',
      create: 'Failed to create user',
      update: 'Failed to update user',
      delete: 'Failed to delete user',
    },
  },
  'zh-TW': {
    title: '使用者管理',
    subtitle: '管理使用者、角色與群組。',
    tabs: {
      users: '使用者',
      roles: '角色',
      groups: '群組',
      clients: 'API 用戶端',
    },
    createUser: '建立使用者',
    table: {
      name: '名稱',
      email: '電子郵件',
      role: '角色',
      policy: '政策',
      status: '狀態',
      empty: '找不到使用者。',
      active: '啟用中',
      inactive: '未啟用',
    },
    rowActions: {
      edit: '編輯',
      remove: '移除',
    },
    roleLabels: {
      super_admin: '超級管理員',
      senior_pastor: '主任牧師',
      pastor: '牧師',
      admin_staff: '行政同工',
      ministry_leader: '事工負責人',
      volunteer: '志工',
      guest: '訪客',
    },
    roleDescriptions: {
      super_admin:
        '完整平台控制權：組織設定、使用者管理、RBAC、代理生命週期、頻道設定、技能審核、供應商、系統健康狀態。',
      senior_pastor: '可檢視所有事工類別的工作區資料夾，並可核准／刪除代理與技能，但不管理系統設定。',
      pastor: '與主任牧師相同的跨類別檢視權限；著重於事工督導而非平台管理。',
      admin_staff:
        '建置與營運：建立代理、撰寫技能、執行代理、排程任務、監控用量、管理頻道、SDK 整合。',
      ministry_leader: '僅限於自己負責的事工類別工作區資料夾：建立與執行代理、提交技能、管理該類別內容。',
      volunteer: '可在自己負責的事工類別內執行代理與檢視內容，無法建立或編輯代理。',
      guest: '唯讀：儀表板、稽核日誌、Token 報表。',
    },
    departmentLabels: {
      all: '所有事工類別',
      program_coordination: '事工協調',
      donor_engagement: '財務管理',
      monitoring_evaluation: '國度成效',
      communications: '宣揚福音',
      field_operations: '宣教工場',
      pastoral_care: '牧養關懷',
      finance: '財務',
      outreach: '外展佈道',
      scripture_literacy: '聖經與識字',
    },
    userCount: (n: number) => `${n} 位使用者`,
    matrix: {
      heading: '權限矩陣',
      permission: '權限',
      footnote: '角色由系統定義。如需變更使用者的角色，請聯絡您的管理員。',
      allowed: '允許',
      notAllowed: '不允許',
    },
    categories: {
      agents: '代理',
      skills: '技能',
      governance: '治理',
      administration: '管理',
    },
    permissions: {
      viewAgentDefs: '檢視代理定義',
      createEditAgent: '建立／編輯代理',
      deleteAgent: '刪除代理',
      runAgent: '執行代理',
      browseMarketplace: '瀏覽市集',
      submitSkill: '提交技能',
      approveSkill: '核准／拒絕技能',
      viewTokenOrg: '檢視 Token 用量（全組織）',
      viewTokenOwn: '檢視 Token 用量（個人）',
      setBudgetAlerts: '設定預算提醒',
      viewAuditLogs: '檢視稽核日誌',
      exportAuditLogs: '匯出稽核日誌',
      manageUsers: '管理使用者',
      assignRoles: '指派角色',
      managePolicies: '管理政策',
      configureProviders: '設定供應商',
      orgSettings: '組織設定',
      manageGroups: '管理群組',
    },
    createDialog: {
      title: '建立使用者',
      description: '新增使用者至平台。',
      name: '名稱',
      email: '電子郵件',
      password: '密碼',
      role: '角色',
      department: '事工類別',
      policy: '政策',
      cancel: '取消',
      submit: '建立',
    },
    assignStep: {
      heading: '使用者已建立',
      added: (name: string) => `${name} 已新增至平台。`,
      assignAgent: '指派主要代理',
      selectAgent: '選擇代理…',
      help: '指派主要代理，讓此使用者可以開始對話。',
      skip: '略過',
      assign: '指派',
    },
    doneStep: {
      heading: '全部完成！',
      createdReadOnly: (name: string) => `${name} 已建立，並具有唯讀存取權限。`,
      createdAgent: (name: string) => `${name} 已建立，並已指派主要代理。`,
      done: '完成',
    },
    editDialog: {
      title: '編輯使用者',
      description: (name: string) => `更新 ${name} 的個人資料。`,
      name: '名稱',
      role: '角色',
      department: '事工類別',
      policy: '政策',
      status: '狀態',
      active: '啟用中',
      inactive: '未啟用',
      primaryAgent: '主要代理',
      noAgent: '未指派代理',
      readOnlyHelp: '訪客無法執行代理。',
      agentHelp: '主要代理可讓此使用者開始對話。',
      cancel: '取消',
      save: '儲存',
    },
    deleteDialog: {
      title: '移除使用者',
      confirm: (name: string, email: string) =>
        `確定要移除 ${name}（${email}）嗎？此操作無法復原。`,
      cancel: '取消',
      remove: '移除',
    },
    errors: {
      load: '載入資料失敗',
      create: '建立使用者失敗',
      update: '更新使用者失敗',
      delete: '刪除使用者失敗',
    },
  },
} satisfies Messages<{
  title: string;
  subtitle: string;
  tabs: { users: string; roles: string; groups: string; clients: string };
  createUser: string;
  table: {
    name: string;
    email: string;
    role: string;
    policy: string;
    status: string;
    empty: string;
    active: string;
    inactive: string;
  };
  rowActions: { edit: string; remove: string };
  roleLabels: Record<RoleKey, string>;
  roleDescriptions: Record<RoleKey, string>;
  departmentLabels: Record<DepartmentKey, string>;
  userCount: (n: number) => string;
  matrix: {
    heading: string;
    permission: string;
    footnote: string;
    allowed: string;
    notAllowed: string;
  };
  categories: { agents: string; skills: string; governance: string; administration: string };
  permissions: Record<string, string>;
  createDialog: {
    title: string;
    description: string;
    name: string;
    email: string;
    password: string;
    role: string;
    department: string;
    policy: string;
    cancel: string;
    submit: string;
  };
  assignStep: {
    heading: string;
    added: (name: string) => string;
    assignAgent: string;
    selectAgent: string;
    help: string;
    skip: string;
    assign: string;
  };
  doneStep: {
    heading: string;
    createdReadOnly: (name: string) => string;
    createdAgent: (name: string) => string;
    done: string;
  };
  editDialog: {
    title: string;
    description: (name: string) => string;
    name: string;
    role: string;
    department: string;
    policy: string;
    status: string;
    active: string;
    inactive: string;
    primaryAgent: string;
    noAgent: string;
    readOnlyHelp: string;
    agentHelp: string;
    cancel: string;
    save: string;
  };
  deleteDialog: {
    title: string;
    confirm: (name: string, email: string) => string;
    cancel: string;
    remove: string;
  };
  errors: { load: string; create: string; update: string; delete: string };
}>;

export default function UsersPage() {
  const t = useT(messages);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [policies, setPolicies] = useState<ApiPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<'form' | 'assign' | 'done'>('form');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [createdUserName, setCreatedUserName] = useState('');
  const [createdUserRole, setCreatedUserRole] = useState('');
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [editUserRole, setEditUserRole] = useState('');
  const [deleteUser, setDeleteUser] = useState<ApiUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Agent assignment state
  const [agentDefs, setAgentDefs] = useState<{ id: string; name: string }[]>([]);
  const [assigningAgent, setAssigningAgent] = useState(false);
  // User agent assignments (userId -> { userAgentId, agentDefinitionId })
  const [userAgentMap, setUserAgentMap] = useState<
    Map<string, { userAgentId: string; agentDefinitionId: string }>
  >(new Map());
  const [editUserAgentId, setEditUserAgentId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, policiesRes, agentsRes, userAgentsRes] = await Promise.all([
        authFetch<PaginatedUsers>('/admin/users?limit=100'),
        authFetch<PaginatedPolicies>('/admin/policies?limit=100'),
        authFetch<{ data: { id: string; name: string; role: string }[] }>(
          '/api/v1/agents?role=primary&limit=100',
        ),
        authFetch<{ id: string; userId: string; agentDefinitionId: string }[]>(
          '/api/v1/agents/user-agents',
        ),
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setPolicies(Array.isArray(policiesRes.data) ? policiesRes.data : []);
      setAgentDefs(agentsRes.data.filter((a) => a.role === 'primary'));
      // Build user -> userAgent mapping
      const map = new Map<string, { userAgentId: string; agentDefinitionId: string }>();
      for (const ua of userAgentsRes) {
        map.set(ua.userId, { userAgentId: ua.id, agentDefinitionId: ua.agentDefinitionId });
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
      const role = form.get('role') as string;
      const created = await authFetch<ApiUser>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          name: form.get('name'),
          password: form.get('password'),
          role,
          department: form.get('department'),
          policyId: form.get('policyId'),
        }),
      });
      setCreatedUserId(created.id);
      setCreatedUserName(created.name);
      setCreatedUserRole(role);
      setSelectedAgentId('');

      // Skip agent assignment for read-only roles (they can't run agents)
      if (role === READ_ONLY_ROLE) {
        setCreateStep('done');
      } else {
        setCreateStep('assign');
        // Fetch agent definitions for assignment step
        void authFetch<{ data: { id: string; name: string; role: string; isActive: boolean }[] }>(
          '/api/v1/agents?limit=100&role=primary',
        )
          .then((res) => {
            setAgentDefs(
              Array.isArray(res.data)
                ? res.data.filter((a) => a.isActive).map((a) => ({ id: a.id, name: a.name }))
                : [],
            );
          })
          .catch(() => {
            /* silent */
          });
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.create);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignAgent() {
    if (!createdUserId || !selectedAgentId) return;
    setAssigningAgent(true);
    try {
      await authFetch('/api/v1/agents/user-agents', {
        method: 'POST',
        body: JSON.stringify({ userId: createdUserId, agentDefinitionId: selectedAgentId }),
      });
      setCreateStep('done');
    } catch {
      /* silent — agent can be assigned later */
    } finally {
      setAssigningAgent(false);
    }
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setCreateStep('form');
    setCreatedUserId(null);
    setSelectedAgentId('');
  }

  function openEditUser(user: ApiUser) {
    setEditUser(user);
    setEditUserRole(user.role);
    const existing = userAgentMap.get(user.id);
    setEditUserAgentId(existing?.agentDefinitionId ?? '');
  }

  async function handleUpdate(id: string, data: Record<string, unknown>, agentDefId: string) {
    setSaving(true);
    setError('');
    try {
      // Update user data
      await authFetch(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      // Handle primary agent assignment
      const existing = userAgentMap.get(id);
      if (agentDefId && agentDefId !== existing?.agentDefinitionId) {
        if (existing) {
          // Update existing user-agent assignment
          await authFetch(`/api/v1/agents/user-agents/${existing.userAgentId}`, {
            method: 'PATCH',
            body: JSON.stringify({ agentDefinitionId: agentDefId }),
          });
        } else {
          // Create new user-agent assignment
          await authFetch('/api/v1/agents/user-agents', {
            method: 'POST',
            body: JSON.stringify({ userId: id, agentDefinitionId: agentDefId }),
          });
        }
      }

      setEditUser(null);
      setEditUserAgentId('');
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
      await authFetch(`/admin/users/${id}`, { method: 'DELETE' });
      setDeleteUser(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.delete);
    } finally {
      setSaving(false);
    }
  }

  // ---- Sorting ----
  const sorts = parseSorts(searchParams.get('sort'));

  function toggleSort(key: SortKey) {
    const existing = sorts.find((s) => s.key === key);
    let newSorts: SortEntry[];
    if (!existing) {
      // Add new sort column
      newSorts = [...sorts, { key, dir: 'asc' }];
    } else if (existing.dir === 'asc') {
      // Flip to desc
      newSorts = sorts.map((s) => (s.key === key ? { ...s, dir: 'desc' as SortDir } : s));
    } else {
      // Remove this sort
      newSorts = sorts.filter((s) => s.key !== key);
    }
    const params = new URLSearchParams(searchParams.toString());
    if (newSorts.length > 0) {
      params.set('sort', serializeSorts(newSorts));
    } else {
      params.delete('sort');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function getSortIcon(key: SortKey) {
    const entry = sorts.find((s) => s.key === key);
    if (!entry) return <ArrowUpDown className="ml-1 inline size-3 text-muted-foreground/40" />;
    if (entry.dir === 'asc') return <ArrowUp className="ml-1 inline size-3" />;
    return <ArrowDown className="ml-1 inline size-3" />;
  }

  const sortedUsers = useMemo(() => {
    const roleOrder: Record<string, number> = Object.fromEntries(
      ROLE_ORDER.map((role, i) => [role, i]),
    );
    const policyMap = new Map(policies.map((p) => [p.id, p.name]));

    // Client (headless API) accounts are managed in the dedicated "API Clients" tab —
    // hide them from the interactive Users list so the edit dialog can't hit the
    // client role (which the generic role picker intentionally doesn't offer).
    return users
      .filter((u) => u.role !== 'client')
      .sort((a, b) => {
        for (const { key, dir } of sorts) {
          let cmp = 0;
          switch (key) {
            case 'name':
              cmp = a.name.localeCompare(b.name);
              break;
            case 'email':
              cmp = a.email.localeCompare(b.email);
              break;
            case 'role':
              cmp = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
              break;
            case 'plan':
              cmp = (policyMap.get(a.policyId) ?? '').localeCompare(policyMap.get(b.policyId) ?? '');
              break;
            case 'status':
              cmp = Number(b.isActive) - Number(a.isActive);
              break;
          }
          if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
  }, [users, sorts, policies]);

  useAnimeOnMount(staggerFadeUp('[data-animate="user-rows"] tr', { stagger: STAGGER.tight }));

  // Role counts for the Roles tab cards
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
        }}
      >
        <div className="flex items-center justify-between">
          <TabsList className="h-10 rounded-full p-1">
            <TabsTrigger value="users" className="rounded-full px-4">
              {t.tabs.users}
            </TabsTrigger>
            <TabsTrigger value="roles" className="rounded-full px-4">
              {t.tabs.roles}
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-full px-4">
              {t.tabs.groups}
            </TabsTrigger>
            <TabsTrigger value="clients" className="rounded-full px-4">
              {t.tabs.clients}
            </TabsTrigger>
          </TabsList>
          {tab === 'users' && (
            <Button
              size="sm"
              onClick={() => {
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-1 size-4" />
              {t.createUser}
            </Button>
          )}
        </div>

        {/* ---- Users Tab ---- */}
        <TabsContent value="users" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-md border bg-background/30 backdrop-blur-sm p-8 text-center text-sm text-muted-foreground">
              {t.table.empty}
            </div>
          ) : (
            <div className="rounded-md border bg-background/30 backdrop-blur-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        toggleSort('name');
                      }}
                    >
                      {t.table.name} {getSortIcon('name')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        toggleSort('email');
                      }}
                    >
                      {t.table.email} {getSortIcon('email')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        toggleSort('role');
                      }}
                    >
                      {t.table.role} {getSortIcon('role')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        toggleSort('plan');
                      }}
                    >
                      {t.table.policy} {getSortIcon('plan')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        toggleSort('status');
                      }}
                    >
                      {t.table.status} {getSortIcon('status')}
                    </TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody data-animate="user-rows">
                  {sortedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={roleVariant(user.role)}>
                            {t.roleLabels[user.role as keyof typeof t.roleLabels] ?? user.role}
                          </Badge>
                          {user.department !== 'all' && (
                            <span className="text-xs text-muted-foreground">
                              {t.departmentLabels[user.department as keyof typeof t.departmentLabels] ??
                                user.department}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {policies.find((p) => p.id === user.policyId)?.name ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'secondary' : 'outline'}>
                          {user.isActive ? t.table.active : t.table.inactive}
                        </Badge>
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
                                openEditUser(user);
                              }}
                            >
                              {t.rowActions.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => {
                                setDeleteUser(user);
                              }}
                            >
                              {t.rowActions.remove}
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
        </TabsContent>

        {/* ---- Roles Tab ---- */}
        <TabsContent value="roles" className="mt-4 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ROLE_ORDER.map((role) => {
              const Icon = roleIcons[role] ?? Shield;
              const count = roleCounts[role] ?? 0;
              return (
                <div key={role} className="rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t.roleLabels[role]}</h3>
                      <p className="text-xs text-muted-foreground">{t.userCount(count)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{t.roleDescriptions[role]}</p>
                </div>
              );
            })}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">{t.matrix.heading}</h3>
            <div className="overflow-x-auto rounded-md border bg-background/30 backdrop-blur-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">{t.matrix.permission}</TableHead>
                    {ROLE_ORDER.map((role) => (
                      <TableHead key={role} className="text-center whitespace-nowrap">
                        {t.roleLabels[role]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionMatrix.map((group) => (
                    <Fragment key={group.categoryKey}>
                      <TableRow>
                        <TableCell
                          colSpan={ROLE_ORDER.length + 1}
                          className="bg-muted/50 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {t.categories[group.categoryKey as keyof typeof t.categories]}
                        </TableCell>
                      </TableRow>
                      {group.permissions.map((perm) => (
                        <TableRow key={perm.key}>
                          <TableCell className="text-sm">{t.permissions[perm.key as keyof typeof t.permissions]}</TableCell>
                          {ROLE_ORDER.map((role) => (
                            <TableCell key={role} className="text-center">
                              {perm.allowed.has(role) ? (
                                <Check
                                  className="mx-auto size-4 text-green-500"
                                  aria-label={t.matrix.allowed}
                                />
                              ) : (
                                <Minus
                                  className="mx-auto size-4 text-muted-foreground/40"
                                  aria-label={t.matrix.notAllowed}
                                />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t.matrix.footnote}</p>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <GroupsTab />
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <ApiClientsTab />
        </TabsContent>
      </Tabs>

      {/* ---- Create User Dialog (two-step) ---- */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) closeCreateDialog();
        }}
      >
        <DialogContent>
          {createStep === 'form' && (
            <>
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
                  <Label htmlFor="create-name">{t.createDialog.name}</Label>
                  <Input id="create-name" name="name" required autoComplete="off" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-email">{t.createDialog.email}</Label>
                  <Input id="create-email" name="email" type="email" required autoComplete="off" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-password">{t.createDialog.password}</Label>
                  <div className="relative">
                    <Input
                      id="create-password"
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
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <EyeIcon className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-role">{t.createDialog.role}</Label>
                  <select
                    name="role"
                    id="create-role"
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    defaultValue="admin_staff"
                  >
                    {ROLE_ORDER.map((role) => (
                      <option key={role} value={role}>
                        {t.roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-department">{t.createDialog.department}</Label>
                  <select
                    name="department"
                    id="create-department"
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    defaultValue="all"
                  >
                    {DEPARTMENT_ORDER.map((department) => (
                      <option key={department} value={department}>
                        {t.departmentLabels[department]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-plan">{t.createDialog.policy}</Label>
                  <select
                    name="policyId"
                    id="create-plan"
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
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeCreateDialog}>
                    {t.createDialog.cancel}
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {t.createDialog.submit}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {createStep === 'assign' && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-500/15">
                <Check className="size-8 text-green-500 animate-in zoom-in-50 duration-300" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{t.assignStep.heading}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.assignStep.added(createdUserName)}
                </p>
              </div>
              <div className="flex w-full flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="assign-agent-def">{t.assignStep.assignAgent}</Label>
                  <select
                    id="assign-agent-def"
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedAgentId}
                    onChange={(e) => {
                      setSelectedAgentId(e.target.value);
                    }}
                    disabled={assigningAgent}
                  >
                    <option value="">{t.assignStep.selectAgent}</option>
                    {agentDefs.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">{t.assignStep.help}</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeCreateDialog}>
                    {t.assignStep.skip}
                  </Button>
                  <Button
                    disabled={!selectedAgentId || assigningAgent}
                    onClick={() => {
                      void handleAssignAgent();
                    }}
                  >
                    {assigningAgent && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {t.assignStep.assign}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          )}

          {createStep === 'done' && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-500/15">
                <Check className="size-8 text-green-500 animate-in zoom-in-50 duration-300" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{t.doneStep.heading}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {createdUserRole === READ_ONLY_ROLE
                    ? t.doneStep.createdReadOnly(createdUserName)
                    : t.doneStep.createdAgent(createdUserName)}
                </p>
              </div>
              <Button onClick={closeCreateDialog}>{t.doneStep.done}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Edit User Dialog ---- */}
      <Dialog
        open={editUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditUser(null);
          }
        }}
      >
        {editUser && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.editDialog.title}</DialogTitle>
              <DialogDescription>{t.editDialog.description(editUser.name)}</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                void handleUpdate(
                  editUser.id,
                  {
                    name: form.get('name'),
                    role: form.get('role'),
                    department: form.get('department'),
                    policyId: form.get('policyId'),
                    isActive: form.get('isActive') === 'true',
                  },
                  editUserAgentId,
                );
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-name">{t.editDialog.name}</Label>
                <Input id="edit-name" name="name" defaultValue={editUser.name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-role">{t.editDialog.role}</Label>
                <select
                  name="role"
                  id="edit-role"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={editUserRole}
                  onChange={(e) => {
                    setEditUserRole(e.target.value);
                    if (e.target.value === READ_ONLY_ROLE) {
                      setEditUserAgentId('');
                    }
                  }}
                >
                  {ROLE_ORDER.map((role) => (
                    <option key={role} value={role}>
                      {t.roleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-department">{t.editDialog.department}</Label>
                <select
                  name="department"
                  id="edit-department"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  defaultValue={editUser.department}
                >
                  {DEPARTMENT_ORDER.map((department) => (
                    <option key={department} value={department}>
                      {t.departmentLabels[department]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-plan">{t.editDialog.policy}</Label>
                <select
                  name="policyId"
                  id="edit-plan"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  defaultValue={editUser.policyId}
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
                <Label htmlFor="edit-status">{t.editDialog.status}</Label>
                <select
                  name="isActive"
                  id="edit-status"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  defaultValue={String(editUser.isActive)}
                >
                  <option value="true">{t.editDialog.active}</option>
                  <option value="false">{t.editDialog.inactive}</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-agent">{t.editDialog.primaryAgent}</Label>
                <select
                  id="edit-agent"
                  className="rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  value={editUserAgentId}
                  onChange={(e) => {
                    setEditUserAgentId(e.target.value);
                  }}
                  disabled={editUserRole === READ_ONLY_ROLE}
                >
                  <option value="">{t.editDialog.noAgent}</option>
                  {agentDefs.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {editUserRole === READ_ONLY_ROLE ? t.editDialog.readOnlyHelp : t.editDialog.agentHelp}
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditUser(null);
                  }}
                >
                  {t.editDialog.cancel}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t.editDialog.save}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* ---- Delete User Confirm ---- */}
      <AlertDialog
        open={deleteUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteUser(null);
          }
        }}
      >
        {deleteUser && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.deleteDialog.confirm(deleteUser.name, deleteUser.email)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.deleteDialog.cancel}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  void handleDelete(deleteUser.id);
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
    </div>
  );
}
