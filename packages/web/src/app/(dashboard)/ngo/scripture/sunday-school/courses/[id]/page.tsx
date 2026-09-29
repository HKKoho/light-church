'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useT, type Messages } from '@/lib/i18n';
import { WisdomCourseManager } from '../../../../../wisdom-in-bible/course-manager';

const messages = {
  en: { back: 'Sunday School' },
  'zh-TW': { back: '主日學' },
} satisfies Messages<{ back: string }>;

/** Staff: one Sunday School course — its cycles, lessons and church website status. */
export default function SundaySchoolCoursePage() {
  const t = useT(messages);
  const { id } = useParams<{ id: string }>();
  return (
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <Link
        href="/ngo/scripture/sunday-school"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>
      <WisdomCourseManager courseId={id} />
    </div>
  );
}
