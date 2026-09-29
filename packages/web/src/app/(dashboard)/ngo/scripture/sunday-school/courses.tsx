'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, GraduationCap, Lightbulb, Loader2, Plus } from 'lucide-react';
import {
  WISDOM_COURSE_ID,
  WISDOM_EDITOR_ROLES,
  type WisdomAdminCourse,
  type WisdomCourseInfo,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/auth';
import { useT, type Messages } from '@/lib/i18n';
import { CourseDialog } from '../../../wisdom-in-bible/course-dialog';
import { useWisdomT } from '../../../wisdom-in-bible/messages';
import { PublishButton } from '../../../wisdom-in-bible/publish-button';
import { courseAdminHref } from '../../../wisdom-in-bible/routes';
import { ErrorBanner, errorMessage } from '../../../wisdom-in-bible/shared';

const messages = {
  en: {
    wisdomName: 'Wisdom in Bible',
    wisdomDesc: 'Courses to read and understand Bible regularly.',
  },
  'zh-TW': {
    wisdomName: '聖經中的智慧',
    wisdomDesc: '定期閱讀及明白聖經的課程。',
  },
} satisfies Messages<{ wisdomName: string; wisdomDesc: string }>;

const cardClass =
  'group relative h-full gap-3 py-4 transition-colors hover:border-foreground/40 hover:bg-accent/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring';

/**
 * Sunday School courses, Wisdom in Bible first. Each card opens the course;
 * editors can publish it on the church website and start new courses from
 * the Wisdom in Bible template.
 */
export function SundaySchoolCourses() {
  const t = useT(messages);
  const w = useWisdomT();
  const router = useRouter();
  const { user } = useAuth();
  const isEditor = !!user && WISDOM_EDITOR_ROLES.includes(user.role);
  const [courses, setCourses] = useState<WisdomAdminCourse[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch<{ data: WisdomAdminCourse[] }>('/api/v1/wisdom/admin/courses');
      setCourses(res.data);
    } catch (err) {
      setError(errorMessage(err, w.failed));
    }
  }, [w.failed]);

  useEffect(() => {
    if (isEditor) void load();
  }, [isEditor, load]);

  const replace = (next: WisdomCourseInfo) =>
    setCourses((all) => all?.map((c) => (c.id === next.id ? { ...c, ...next } : c)) ?? all);

  // Everyone else sees the Wisdom in Bible card only.
  const shown: readonly (Pick<WisdomAdminCourse, 'id' | 'title' | 'description'> &
    Partial<WisdomAdminCourse>)[] = isEditor
    ? (courses ?? [])
    : [{ id: WISDOM_COURSE_ID, title: '', description: '' }];

  return (
    <div className="flex flex-col gap-3">
      <ErrorBanner message={error} />
      {isEditor && !courses && !error ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((course) => {
            const isWisdom = course.id === WISDOM_COURSE_ID;
            const Icon = isWisdom ? Lightbulb : GraduationCap;
            return (
              <Card key={course.id} className={cardClass}>
                <CardHeader className="px-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className="size-4 text-muted-foreground" />
                    {/* The whole card opens the course; the publish button sits above the link. */}
                    <Link
                      href={courseAdminHref(course.id)}
                      className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
                    >
                      {isWisdom ? t.wisdomName : course.title}
                    </Link>
                    <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {isWisdom ? t.wisdomDesc : course.description}
                  </CardDescription>
                  {course.modules !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {w.lessonCount(course.publishedModules ?? 0, course.modules)}
                    </p>
                  )}
                </CardHeader>
                {isEditor && course.published !== undefined && (
                  <div className="relative z-10 px-4">
                    <PublishButton
                      course={{ id: course.id, published: course.published }}
                      onChange={replace}
                      onError={setError}
                      size="sm"
                    />
                  </div>
                )}
              </Card>
            );
          })}
          {isEditor && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-5" />
              {w.newCourse}
            </button>
          )}
        </div>
      )}
      <CourseDialog
        course={creating ? 'new' : null}
        nextOrder={Math.max(0, ...(courses ?? []).map((c) => c.sortOrder)) + 1}
        onClose={() => setCreating(false)}
        onSaved={(created) => {
          setCreating(false);
          router.push(courseAdminHref(created.id));
        }}
      />
    </div>
  );
}
