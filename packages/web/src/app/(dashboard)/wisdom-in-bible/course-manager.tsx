'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Pencil, Plus } from 'lucide-react';
import {
  WISDOM_EDITOR_ROLES,
  WISDOM_MEMBER_PATH,
  type WisdomAdminCycle,
  type WisdomCycleInfo,
  type WisdomModuleStatus,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { authFetch } from '@/lib/auth';
import { CycleDialog } from './cycle-dialog';
import { useWisdomT } from './messages';
import { DeleteButton, ErrorBanner, errorMessage } from './shared';

const statusVariant: Record<WisdomModuleStatus, 'default' | 'secondary' | 'outline'> = {
  published: 'default',
  draft: 'secondary',
  archived: 'outline',
};

/**
 * Staff: the Wisdom in Bible course — cycles and their modules. Shown as a
 * tab on the Church Website page.
 */
export function WisdomCourseManager() {
  const t = useWisdomT();
  const { user } = useAuth();
  const isEditor = !!user && WISDOM_EDITOR_ROLES.includes(user.role);
  const [cycles, setCycles] = useState<WisdomAdminCycle[] | null>(null);
  const [editing, setEditing] = useState<WisdomCycleInfo | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCycles(
        (await authFetch<{ data: WisdomAdminCycle[] }>('/api/v1/wisdom/admin/cycles')).data,
      );
      setError(null);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  }, [t.failed]);

  useEffect(() => {
    if (isEditor) void load();
  }, [isEditor, load]);

  const deleteCycle = async (id: string) => {
    try {
      await authFetch(`/api/v1/wisdom/admin/cycles/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  };

  const nextOrder = Math.max(0, ...(cycles ?? []).map((c) => c.sortOrder)) + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted-foreground">{t.subtitle}</p>
        {isEditor && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={WISDOM_MEMBER_PATH} target="_blank">
                <ExternalLink className="size-4" />
                {t.viewSite}
              </Link>
            </Button>
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" />
              {t.newCycle}
            </Button>
          </div>
        )}
      </div>

      {!isEditor ? (
        <p className="text-sm text-muted-foreground">{t.noAccess}</p>
      ) : (
        <>
          <ErrorBanner message={error} />
          {!cycles ? (
            !error && <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : cycles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noCycles}</p>
          ) : (
            cycles.map((cycle) => (
              <Card key={cycle.id} className="gap-3">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{cycle.title}</CardTitle>
                    {cycle.description && <CardDescription>{cycle.description}</CardDescription>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/wisdom-in-bible/modules/new?cycle=${cycle.id}`}>
                        <Plus className="size-4" />
                        {t.addModule}
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`${t.edit} ${cycle.title}`}
                      onClick={() => setEditing(cycle)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <DeleteButton
                      name={cycle.title}
                      body={t.deleteCycleBody}
                      onConfirm={() => void deleteCycle(cycle.id)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {cycle.modules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.noModules}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.module}</TableHead>
                          <TableHead className="w-28">{t.status}</TableHead>
                          <TableHead className="w-24 text-right">{t.answered}</TableHead>
                          <TableHead className="w-24 text-right">{t.finished}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cycle.modules.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="max-w-0">
                              <Link
                                href={`/wisdom-in-bible/modules/${m.id}`}
                                className="block truncate font-medium hover:text-primary hover:underline"
                              >
                                {m.title}
                              </Link>
                              {m.subtitle && (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {m.subtitle}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant[m.status]}>
                                {t.statuses[m.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{m.responses}</TableCell>
                            <TableCell className="text-right tabular-nums">{m.completed}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}

      <CycleDialog
        cycle={editing}
        nextOrder={nextOrder}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    </div>
  );
}
