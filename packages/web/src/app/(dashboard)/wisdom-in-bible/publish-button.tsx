'use client';

import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import type { WisdomCourseInfo } from '@clawix/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { useWisdomT } from './messages';
import { errorMessage } from './shared';

/** Shows whether a course is on the church website, with a button to publish or remove it. */
export function PublishButton({
  course,
  onChange,
  onError,
  size = 'default',
}: {
  course: Pick<WisdomCourseInfo, 'id' | 'published'>;
  onChange: (next: WisdomCourseInfo) => void;
  onError: (message: string) => void;
  size?: 'default' | 'sm';
}) {
  const t = useWisdomT();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await authFetch<{ data: WisdomCourseInfo }>(
        `/api/v1/wisdom/admin/courses/${course.id}/publish`,
        { method: 'PUT', body: JSON.stringify({ published: !course.published }) },
      );
      onChange(res.data);
    } catch (err) {
      onError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={course.published ? 'default' : 'secondary'}>
        {course.published ? t.onWebsite : t.notOnWebsite}
      </Badge>
      <Button
        size={size}
        variant={course.published ? 'outline' : 'default'}
        onClick={() => void toggle()}
        disabled={busy}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
        {course.published ? t.unpublish : t.publish}
      </Button>
    </div>
  );
}
