'use client';

import { SUNDAY_SCHOOL_EDITOR_ROLES, type SsLessonStatus } from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStudioT } from './messages';

export { ErrorBanner, Field, errorMessage } from '../../../../church-website/shared';
export { DeleteButton } from '../../../../wisdom-in-bible/shared';

export const STUDIO_PATH = '/ngo/scripture/sunday-school/studio';
export const courseHref = (id: string) => `${STUDIO_PATH}/courses/${id}`;
export const lessonHref = (id: string) => `${STUDIO_PATH}/lessons/${id}`;
export const API = '/api/v1/sunday-school';

export function useIsStudioEditor(): boolean {
  const { user } = useAuth();
  return !!user && SUNDAY_SCHOOL_EDITOR_ROLES.includes(user.role);
}

/** A select over a fixed list of keys, each shown by its label. */
export function EnumSelect<K extends string>({
  id,
  value,
  options,
  labels,
  onChange,
  disabled,
}: {
  id: string;
  value: K;
  options: readonly K[];
  labels: Record<K, string>;
  onChange: (value: K) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as K)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((key) => (
          <SelectItem key={key} value={key}>
            {labels[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const STATUS_VARIANT: Record<SsLessonStatus, 'outline' | 'secondary' | 'default'> = {
  outline: 'outline',
  generated: 'secondary',
  approved: 'default',
};

export function LessonStatusBadge({ status }: { status: SsLessonStatus }) {
  const t = useStudioT();
  return <Badge variant={STATUS_VARIANT[status]}>{t.statuses[status]}</Badge>;
}
