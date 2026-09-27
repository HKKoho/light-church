'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import {
  CHURCH_SITE_BASE,
  VENUE_APPLICATION_STATUSES,
  VENUE_RENTAL_REVIEWER_ROLES,
  type VenueApplicationInfo,
  type VenueApplicationStatus,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { ApplicationCard } from './application-card';
import { useVenueRentalT } from './messages';

type Filter = VenueApplicationStatus | 'all';
const FILTERS: readonly Filter[] = ['pending', ...VENUE_APPLICATION_STATUSES.slice(1), 'all'];
const BASE = '/api/v1/venue-rental/applications';
const FORM_PATH = `${CHURCH_SITE_BASE}/rent`;

export default function VenueRentalPage() {
  const t = useVenueRentalT();
  const { user } = useAuth();
  const canReview = !!user && VENUE_RENTAL_REVIEWER_ROLES.includes(user.role);
  const [filter, setFilter] = useState<Filter>('pending');
  const [apps, setApps] = useState<readonly VenueApplicationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formUrl, setFormUrl] = useState(FORM_PATH);

  useEffect(() => setFormUrl(`${window.location.origin}${FORM_PATH}`), []);

  const load = useCallback(async () => {
    if (!canReview) return;
    setLoading(true);
    try {
      const query = filter === 'all' ? '' : `?status=${filter}`;
      const res = await authFetch<{ data: VenueApplicationInfo[] }>(`${BASE}${query}`);
      setApps(res.data);
      setError(null);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [canReview, filter, t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Badge variant="outline" className="mb-2 font-mono text-[10px] uppercase tracking-wider">
          {t.phase}
        </Badge>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Building2 className="size-6 text-sky-500" />
          {t.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-sm">
        <span className="font-medium">{t.publicForm}</span>
        <code className="min-w-0 truncate text-muted-foreground">{formUrl}</code>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => void copy()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t.copied : t.copyLink}
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link href={FORM_PATH} target="_blank">
            <ExternalLink className="size-4" />
            {t.openForm}
          </Link>
        </Button>
      </div>

      {!canReview ? (
        <p className="text-sm text-muted-foreground">{t.noAccess}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist">
            {FILTERS.map((f) => (
              <Button
                key={f}
                size="sm"
                role="tab"
                aria-selected={filter === f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
              >
                {t.statuses[f]}
              </Button>
            ))}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : apps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {apps.map((app) => (
                <ApplicationCard
                  key={`${app.id}:${app.status}:${app.adminNotes ?? ''}`}
                  app={app}
                  onReview={(status, adminNotes) =>
                    act(() =>
                      authFetch(`${BASE}/${app.id}/review`, {
                        method: 'PUT',
                        body: JSON.stringify({ status, adminNotes }),
                      }),
                    )
                  }
                  onRemove={() => act(() => authFetch(`${BASE}/${app.id}`, { method: 'DELETE' }))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
