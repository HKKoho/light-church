'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  THEOLOGY_CURATOR_ROLES,
  THEOLOGY_READER_ROLES,
  type TheologySourceStatus,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheologyT } from './messages';

export { ErrorBanner, Field, errorMessage } from '../../../church-website/shared';

export const THEOLOGY_PATH = '/ngo/scripture/theology';
export const API = '/api/v1/theology-library';

export function useTheologyRoles(): { isReader: boolean; isCurator: boolean } {
  const { user } = useAuth();
  return {
    isReader: !!user && THEOLOGY_READER_ROLES.includes(user.role),
    isCurator: !!user && THEOLOGY_CURATOR_ROLES.includes(user.role),
  };
}

export function PageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-border/60 pb-4">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground" asChild>
        <Link href={backHref}>
          <ArrowLeft className="mr-1 size-4" />
          {backLabel}
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
    </header>
  );
}

const STATUS_VARIANT: Record<
  TheologySourceStatus,
  'outline' | 'secondary' | 'default' | 'destructive'
> = {
  processing: 'outline',
  pending_review: 'secondary',
  approved: 'default',
  rejected: 'outline',
  failed: 'destructive',
};

export function SourceStatusBadge({ status }: { status: TheologySourceStatus }) {
  const t = useTheologyT();
  return <Badge variant={STATUS_VARIANT[status]}>{t.statuses[status]}</Badge>;
}
