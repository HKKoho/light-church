'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Loader2, Plus } from 'lucide-react';
import {
  ROLL_CALL_MANAGER_ROLES,
  type RollCallGroupDetail,
  type RollCallGroupSummary,
} from '@clawix/shared';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authFetch } from '@/lib/auth';
import { AiSwitch, useRollCallAi } from './ai-switch';
import { ROLL_CALL_API } from './roll-call-api';
import { useRollCallT } from './messages';

export default function RollCallPage() {
  const t = useRollCallT();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = !!user && ROLL_CALL_MANAGER_ROLES.includes(user.role);
  const ai = useRollCallAi();
  const [groups, setGroups] = useState<RollCallGroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroups(
        (await authFetch<{ data: RollCallGroupSummary[] }>(`${ROLL_CALL_API}/groups`)).data,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.loadError);
    }
  }, [t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch<{ data: RollCallGroupDetail }>(`${ROLL_CALL_API}/groups`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      router.push(`/roll-call/${res.data.id}?tab=members`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.failed);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Badge variant="outline" className="mb-2 font-mono text-[10px] uppercase tracking-wider">
          {t.phase}
        </Badge>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ClipboardCheck className="size-6 text-sky-500" />
          {t.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <AiSwitch ai={ai} />

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4" />
              {t.newGroup}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="group-name">{t.groupName}</Label>
              <Input
                id="group-name"
                value={name}
                maxLength={100}
                placeholder={t.groupNamePlaceholder}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="group-description">{t.description}</Label>
              <Input
                id="group-description"
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button onClick={() => void create()} disabled={busy || name.trim() === ''}>
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              {t.create}
            </Button>
          </CardContent>
        </Card>
      )}

      {groups === null && !error && (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      )}
      {groups?.length === 0 && <p className="text-sm text-muted-foreground">{t.noGroups}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups?.map((g) => (
          <Card key={g.id} className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">
                <Link href={`/roll-call/${g.id}`} className="hover:underline">
                  {g.name}
                </Link>
              </CardTitle>
              <CardDescription className="flex flex-col gap-0.5 text-xs">
                {g.description && <span>{g.description}</span>}
                <span>
                  {t.members(g.memberCount)}
                  {g.lastSessionDate && ` · ${t.lastRollCall(g.lastSessionDate)}`}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <Button asChild size="sm">
                <Link href={`/roll-call/${g.id}`}>{t.open}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
