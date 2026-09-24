'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import type { RollCallGroupDetail, RollCallMemberInfo } from '@clawix/shared';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authFetch } from '@/lib/auth';
import { useRollCallAi } from '../ai-switch';
import { groupApi } from '../roll-call-api';
import { useRollCallT } from '../messages';
import { HistoryPanel } from './history-panel';
import { InsightsPanel } from './insights-panel';
import { MembersPanel } from './members-panel';
import { TakeRoll } from './take-roll';

type Tab = 'roll' | 'history' | 'members' | 'care';

export default function RollCallGroupPage() {
  const t = useRollCallT();
  const router = useRouter();
  const { groupId } = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const ai = useRollCallAi();
  const [group, setGroup] = useState<RollCallGroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab | null) ?? 'roll');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setGroup((await authFetch<{ data: RollCallGroupDetail }>(groupApi(groupId))).data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.loadError);
    }
  }, [groupId, t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!group) {
    return (
      <div className="p-6">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <Loader2 className="size-5 animate-spin" />
        )}
      </div>
    );
  }

  // Newcomers added while taking the roll appear at once; a reload follows.
  const membersAdded = (added: RollCallMemberInfo[]) => {
    const ids = new Set(group.members.map((m) => m.id));
    setGroup({
      ...group,
      members: [
        ...group.members.map((m) => added.find((a) => a.id === m.id) ?? m),
        ...added.filter((a) => !ids.has(a.id)),
      ],
    });
    void load();
  };

  const deleteGroup = async () => {
    try {
      await authFetch(groupApi(groupId), { method: 'DELETE' });
      router.push('/roll-call');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.failed);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <Link
        href="/roll-call"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[group.description, t.members(group.memberCount)].filter(Boolean).join(' · ')}
          </p>
        </div>
        {group.canManage && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1.5 size-4" />
                {t.delete}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteGroupTitle(group.name)}</AlertDialogTitle>
                <AlertDialogDescription>{t.deleteGroupBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void deleteGroup()}>{t.delete}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="roll">{t.tabs.roll}</TabsTrigger>
          <TabsTrigger value="history">{t.tabs.history}</TabsTrigger>
          <TabsTrigger value="members">{t.tabs.members}</TabsTrigger>
          {group.canManage && <TabsTrigger value="care">{t.tabs.care}</TabsTrigger>}
        </TabsList>
        <div className="pt-4">
          <TabsContent value="roll">
            <TakeRoll
              group={group}
              sessionId={sessionId}
              aiReady={ai.ready}
              onSessionChange={setSessionId}
              onMembersAdded={membersAdded}
            />
          </TabsContent>
          <TabsContent value="history">
            <HistoryPanel
              group={group}
              onMembersAdded={membersAdded}
              onOpen={(id) => {
                setSessionId(id);
                setTab('roll');
              }}
            />
          </TabsContent>
          <TabsContent value="members">
            <MembersPanel group={group} aiReady={ai.ready} onChanged={() => void load()} />
          </TabsContent>
          {group.canManage && (
            <TabsContent value="care">
              <InsightsPanel groupId={group.id} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
