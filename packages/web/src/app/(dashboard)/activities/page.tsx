'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Copy, Loader2, MapPin, Plus, Tent, Trash2 } from 'lucide-react';
import {
  ACTIVITY_EDITOR_ROLES,
  ACTIVITY_KINDS,
  activityContentSchema,
  type ActivityDetail,
  type ActivityKind,
  type ActivitySummary,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { authFetch } from '@/lib/auth';
import { ACTIVITIES_API, dateRange } from './activity-api';
import { useActivityT } from './messages';
import { selectClass } from './rows-editor';

export default function ActivitiesPage() {
  const t = useActivityT();
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = !!user && ACTIVITY_EDITOR_ROLES.includes(user.role);
  const [activities, setActivities] = useState<ActivitySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ActivityKind>('mission');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authFetch<{ data: ActivitySummary[] }>(ACTIVITIES_API);
      setActivities(res.data);
      setError(null);
    } catch {
      setError(t.loadError);
    }
  }, [t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const create = () =>
    run(async () => {
      const res = await authFetch<{ data: ActivityDetail }>(ACTIVITIES_API, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim() || t.untitled,
          content: activityContentSchema.parse({ kind }),
        }),
      });
      router.push(`/activities/${res.data.id}?edit=1`);
    });

  const duplicate = (id: string) =>
    run(async () => {
      const res = await authFetch<{ data: ActivityDetail }>(`${ACTIVITIES_API}/${id}/duplicate`, {
        method: 'POST',
      });
      router.push(`/activities/${res.data.id}?edit=1`);
    });

  const remove = (id: string) =>
    run(async () => {
      await authFetch(`${ACTIVITIES_API}/${id}`, { method: 'DELETE' });
      await load();
    });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Badge variant="outline" className="mb-2 font-mono text-[10px] uppercase tracking-wider">
          {t.phase}
        </Badge>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Tent className="size-6 text-emerald-500" />
          {t.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4" />
              {t.newActivity}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="activity-title">{t.titleLabel}</Label>
              <Input
                id="activity-title"
                value={title}
                maxLength={200}
                placeholder={t.titlePlaceholder}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="activity-kind">{t.kindLabel}</Label>
              <select
                id="activity-kind"
                className={selectClass}
                value={kind}
                onChange={(e) => setKind(e.target.value as ActivityKind)}
              >
                {ACTIVITY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t.kinds[k]}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={() => void create()} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              {busy ? t.creating : t.create}
            </Button>
          </CardContent>
        </Card>
      )}

      {activities === null && !error && (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      )}
      {activities?.length === 0 && <p className="text-sm text-muted-foreground">{t.empty}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activities?.map((a) => (
          <Card key={a.id} className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">
                <Link href={`/activities/${a.id}`} className="hover:underline">
                  {a.title}
                </Link>
              </CardTitle>
              <CardDescription className="flex flex-col gap-1 text-xs">
                <span className="flex items-center gap-1.5">
                  <Badge variant="secondary">{t.kinds[a.kind]}</Badge>
                </span>
                {a.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3" />
                    {a.location}
                  </span>
                )}
                {(a.startDate || a.endDate) && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3" />
                    {dateRange(a.startDate, a.endDate)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 px-4">
              <Button asChild size="sm">
                <Link href={`/activities/${a.id}`}>{t.open}</Link>
              </Button>
              {canEdit && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    title={t.duplicateHint}
                    disabled={busy}
                    onClick={() => void duplicate(a.id)}
                  >
                    <Copy className="mr-1.5 size-3.5" />
                    {t.duplicate}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label={`${t.delete} ${a.title}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteTitle(a.title)}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteBody}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void remove(a.id)}>
                          {t.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
