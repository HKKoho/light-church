'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, HeartHandshake, ListChecks, Loader2, Plus, Sparkles } from 'lucide-react';
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
import { SimpleRollCall } from './simple-roll-call';
import { ROLL_CALL_API } from './roll-call-api';
import { useRollCallT } from './messages';

type Mode = 'smart' | 'simple';
const MODE_KEY = 'roll-call-mode';

/** The viewer's last choice of mode — a per-device convenience. */
function useMode(): [Mode, (m: Mode) => void] {
  const [mode, setModeState] = useState<Mode>('smart');
  useEffect(() => {
    try {
      if (localStorage.getItem(MODE_KEY) === 'simple') setModeState('simple');
    } catch {
      // Storage unavailable — default to Smart.
    }
  }, []);
  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // Ignore: the choice just isn't remembered.
    }
  };
  return [mode, setMode];
}

export default function RollCallPage() {
  const t = useRollCallT();
  const [mode, setMode] = useMode();
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
        body: JSON.stringify({
          name: name.trim() || t.untitledGroup,
          description: description.trim(),
        }),
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

      <div role="tablist" className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ['smart', Sparkles, t.modeSmart, t.modeSmartHint],
            ['simple', ListChecks, t.modeSimple, t.modeSimpleHint],
          ] as const
        ).map(([key, Icon, label, hint]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              mode === key ? 'border-sky-500 bg-sky-500/10' : 'hover:bg-muted'
            }`}
          >
            <Icon className="mt-0.5 size-5 text-sky-600" />
            <span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      {mode === 'simple' ? (
        <SimpleRollCall />
      ) : (
        <SmartHome
          canManage={canManage}
          ai={ai}
          groups={groups}
          error={error}
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          busy={busy}
          create={create}
        />
      )}
    </div>
  );
}

interface SmartHomeProps {
  canManage: boolean;
  ai: ReturnType<typeof useRollCallAi>;
  groups: RollCallGroupSummary[] | null;
  error: string | null;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  busy: boolean;
  create: () => Promise<void>;
}

function SmartHome({
  canManage,
  ai,
  groups,
  error,
  name,
  setName,
  description,
  setDescription,
  busy,
  create,
}: SmartHomeProps) {
  const t = useRollCallT();
  return (
    <div className="flex flex-col gap-6">
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
            <Button onClick={() => void create()} disabled={busy}>
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
                {g.followUpCount > 0 && (
                  <span className="flex items-center gap-1 font-medium text-amber-600">
                    <HeartHandshake className="size-3.5" />
                    {t.toFollowUp(g.followUpCount)}
                  </span>
                )}
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
