'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Bot, CalendarClock, Coins, Loader2 } from 'lucide-react';
import { useAnimeOnMount, staggerFadeUp, STAGGER } from '@/lib/anime';
import { VantaBackground } from '@/components/ui/vanta-background';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { authFetch } from '@/lib/auth';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    heading: 'Ministry Dashboard',
    subheading: 'Overview of your gospel mission AI platform — serving the Great Commission.',
    loadFailed: 'Failed to load dashboard data',
    totalRuns: 'Total Runs',
    totalRunsSubtitle: 'all time',
    activeAgents: 'Active Agents',
    activeAgentsSubtitle: 'definitions',
    tokenUsage: 'Token Usage',
    tokenUsageSubtitle: (cost: string) => `$${cost} this month`,
    pendingTasks: 'Scheduled Tasks',
    pendingTasksSubtitle: 'in queue',
    recentRuns: 'Recent Agent Activity',
    recentRunsDescription: 'Latest ministry agent runs across all workflows.',
    noRuns: 'No agent runs yet.',
    colAgent: 'Agent',
    colStatus: 'Status',
    colDuration: 'Duration',
    colTime: 'Time',
    recentActivity: 'Recent Activity',
    recentActivityDescription: 'Latest actions across your ministry workspace.',
    noActivity: 'No activity yet.',
    justNow: 'just now',
    minsAgo: (n: number) => `${n}m ago`,
    hoursAgo: (n: number) => `${n}h ago`,
    daysAgo: (n: number) => `${n}d ago`,
    durationSecs: (n: number) => `${n}s`,
    durationMins: (m: number, s: number) => `${m}m ${s}s`,
  },
  'zh-TW': {
    heading: '事工儀表板',
    subheading: '您的福音宣教 AI 平台概覽 — 服事大使命。',
    loadFailed: '無法載入儀表板資料',
    totalRuns: '總執行次數',
    totalRunsSubtitle: '歷來總計',
    activeAgents: '啟用中的代理',
    activeAgentsSubtitle: '定義',
    tokenUsage: 'Token 用量',
    tokenUsageSubtitle: (cost: string) => `本月 $${cost}`,
    pendingTasks: '待處理任務',
    pendingTasksSubtitle: '佇列中',
    recentRuns: '近期代理執行記錄',
    recentRunsDescription: '所有代理的最新活動。',
    noRuns: '尚無代理執行記錄。',
    colAgent: '代理',
    colStatus: '狀態',
    colDuration: '耗時',
    colTime: '時間',
    recentActivity: '近期活動',
    recentActivityDescription: '工作區的最新操作。',
    noActivity: '尚無活動。',
    justNow: '剛剛',
    minsAgo: (n: number) => `${n} 分鐘前`,
    hoursAgo: (n: number) => `${n} 小時前`,
    daysAgo: (n: number) => `${n} 天前`,
    durationSecs: (n: number) => `${n} 秒`,
    durationMins: (m: number, s: number) => `${m} 分 ${s} 秒`,
  },
} satisfies Messages<{
  heading: string;
  subheading: string;
  loadFailed: string;
  totalRuns: string;
  totalRunsSubtitle: string;
  activeAgents: string;
  activeAgentsSubtitle: string;
  tokenUsage: string;
  tokenUsageSubtitle: (cost: string) => string;
  pendingTasks: string;
  pendingTasksSubtitle: string;
  recentRuns: string;
  recentRunsDescription: string;
  noRuns: string;
  colAgent: string;
  colStatus: string;
  colDuration: string;
  colTime: string;
  recentActivity: string;
  recentActivityDescription: string;
  noActivity: string;
  justNow: string;
  minsAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
  durationSecs: (n: number) => string;
  durationMins: (m: number, s: number) => string;
}>;

type T = typeof messages.en;

interface DashboardStats {
  totalRuns: number;
  activeAgents: number;
  tokenUsage: {
    totalTokens: number;
    totalEstimatedCostUsd: number;
  };
  scheduledTasks: number;
}

interface RecentRun {
  id: string;
  agentName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

interface RecentActivity {
  id: string;
  userName: string;
  action: string;
  resource: string;
  createdAt: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(ms: number | null, t: T): string {
  if (ms === null) return '—';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return t.durationSecs(secs);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return t.durationMins(mins, remainSecs);
}

function formatTimeAgo(iso: string, t: T): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t.justNow;
  if (mins < 60) return t.minsAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  return t.daysAgo(days);
}

function statusVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'secondary' as const;
    case 'failed':
      return 'destructive' as const;
    case 'running':
      return 'default' as const;
    default:
      return 'outline' as const;
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const t = useT(messages);

  useAnimeOnMount(staggerFadeUp('[data-animate="stat-cards"] > div', { stagger: STAGGER.wide }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, runsRes, activityRes] = await Promise.all([
        authFetch<DashboardStats>('/api/v1/dashboard/stats'),
        authFetch<RecentRun[]>('/api/v1/dashboard/recent-runs'),
        authFetch<RecentActivity[]>('/api/v1/dashboard/recent-activity'),
      ]);
      setStats(statsRes);
      setRecentRuns(Array.isArray(runsRes) ? runsRes : []);
      setRecentActivity(Array.isArray(activityRes) ? activityRes : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const statCards = [
    {
      title: t.totalRuns,
      value: stats ? formatNumber(stats.totalRuns) : '—',
      subtitle: t.totalRunsSubtitle,
      icon: Activity,
    },
    {
      title: t.activeAgents,
      value: stats ? String(stats.activeAgents) : '—',
      subtitle: t.activeAgentsSubtitle,
      icon: Bot,
    },
    {
      title: t.tokenUsage,
      value: stats ? formatNumber(stats.tokenUsage.totalTokens) : '—',
      subtitle: stats
        ? t.tokenUsageSubtitle(stats.tokenUsage.totalEstimatedCostUsd.toFixed(2))
        : '',
      icon: Coins,
    },
    {
      title: t.pendingTasks,
      value: stats ? String(stats.scheduledTasks) : '—',
      subtitle: t.pendingTasksSubtitle,
      icon: CalendarClock,
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.heading}</h1>
          <p className="text-sm text-muted-foreground">{t.subheading}</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <VantaBackground effect="topology" className="min-h-[calc(100vh-3.5rem)] p-6">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.heading}</h1>
          <p className="text-sm text-muted-foreground">{t.subheading}</p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats cards */}
        <div data-animate="stat-cards" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
                {stat.subtitle && <p className="text-xs text-muted-foreground">{stat.subtitle}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Recent runs table */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{t.recentRuns}</CardTitle>
              <CardDescription>{t.recentRunsDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentRuns.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t.noRuns}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.colAgent}</TableHead>
                      <TableHead>{t.colStatus}</TableHead>
                      <TableHead>{t.colDuration}</TableHead>
                      <TableHead>{t.colTime}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.agentName}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatDuration(run.durationMs, t)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTimeAgo(run.startedAt, t)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t.recentActivity}</CardTitle>
              <CardDescription>{t.recentActivityDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t.noActivity}</div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" />
                      <div className="flex-1 text-sm">
                        <p>
                          <span className="font-medium">{activity.userName}</span>{' '}
                          <span className="text-muted-foreground">{activity.action}</span>{' '}
                          <span>{activity.resource}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.createdAt, t)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </VantaBackground>
  );
}
