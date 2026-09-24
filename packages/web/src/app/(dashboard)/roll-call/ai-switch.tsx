'use client';

import { useCallback, useEffect, useState } from 'react';
import { Cpu, Loader2 } from 'lucide-react';
import type { RollCallAiStatus } from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { ROLL_CALL_API } from './roll-call-api';
import { useRollCallT } from './messages';

/** Loads the local-AI status; `ready` means switched on and the model answers. */
export function useRollCallAi() {
  const [status, setStatus] = useState<RollCallAiStatus | null>(null);
  const reload = useCallback(async () => {
    try {
      setStatus((await authFetch<{ data: RollCallAiStatus }>(`${ROLL_CALL_API}/ai`)).data);
    } catch {
      setStatus(null);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { status, setStatus, reload, ready: !!status?.enabled && status.available };
}

export function AiSwitch({ ai }: { ai: ReturnType<typeof useRollCallAi> }) {
  const t = useRollCallT();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status } = ai;
  if (!status) return null;
  const isAdmin = user?.role === 'super_admin';

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch<{ data: RollCallAiStatus }>(`${ROLL_CALL_API}/ai`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !status.enabled }),
      });
      ai.setStatus(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Cpu className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t.ai}</span>
        <Badge variant={status.enabled ? 'default' : 'secondary'}>
          {status.enabled ? t.aiOn : t.aiOff}
        </Badge>
        <Badge
          variant="outline"
          className={status.available ? 'text-emerald-600' : 'text-amber-600'}
        >
          {status.available ? t.aiReady(status.model) : t.aiUnavailable}
        </Badge>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={busy}
            onClick={() => void toggle()}
          >
            {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {status.enabled ? t.turnOff : t.turnOn}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t.aiExplain}</p>
      {!status.available && status.reason && (
        <p className="text-xs text-amber-600">{status.reason}</p>
      )}
      {!isAdmin && !status.enabled && (
        <p className="text-xs text-muted-foreground">{t.aiAdminOnly}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
