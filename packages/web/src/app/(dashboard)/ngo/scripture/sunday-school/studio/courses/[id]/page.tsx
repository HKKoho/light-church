'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, Undo2 } from 'lucide-react';
import type { SundaySchoolCourseDetail, SundaySchoolLessonSummary } from '@clawix/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { useStudioT } from '../../messages';
import { useOptionLabels } from '../../options';
import {
  API,
  DeleteButton,
  ErrorBanner,
  STUDIO_PATH,
  errorMessage,
  useIsStudioEditor,
} from '../../shared';
import { SyllabusWeek } from './syllabus-week';

/** Staff: one Studio course — check and approve its syllabus, then open each lesson. */
export default function StudioCoursePage() {
  const t = useStudioT();
  const o = useOptionLabels();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isEditor = useIsStudioEditor();
  const [course, setCourse] = useState<SundaySchoolCourseDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCourse((await authFetch<{ data: SundaySchoolCourseDetail }>(`${API}/courses/${id}`)).data);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  }, [id, t.failed]);

  useEffect(() => {
    if (isEditor) void load();
  }, [isEditor, load]);

  const setApproved = async (syllabusApproved: boolean) => {
    if (!course) return;
    setBusy(true);
    try {
      const res = await authFetch<{ data: SundaySchoolCourseDetail }>(`${API}/courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: course.title, syllabusApproved }),
      });
      setCourse(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await authFetch(`${API}/courses/${id}`, { method: 'DELETE' });
      router.push(STUDIO_PATH);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  };

  const replaceLesson = (next: SundaySchoolLessonSummary) =>
    setCourse((c) => c && { ...c, lessons: c.lessons.map((l) => (l.id === next.id ? next : l)) });

  return (
    <div className="flex min-w-0 flex-col gap-5 p-6">
      <Link
        href={STUDIO_PATH}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.backToStudio}
      </Link>
      {!isEditor && <p className="text-sm text-muted-foreground">{t.noAccess}</p>}
      <ErrorBanner message={error} />
      {isEditor && !course && !error && (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      )}
      {course && (
        <>
          <header className="flex flex-wrap items-start gap-3 border-b border-border/60 pb-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
              <p className="text-sm text-muted-foreground">
                {[
                  t.modes[course.mode],
                  course.subject,
                  course.profileName,
                  o.methodology[course.methodology],
                  o.delivery[course.deliveryFormat],
                  t.languages[course.language],
                ].join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {course.syllabusApproved ? (
                <>
                  <Badge>{t.approved}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void setApproved(false)}
                    disabled={busy}
                  >
                    <Undo2 className="size-4" />
                    {t.reopenSyllabus}
                  </Button>
                </>
              ) : (
                <Button onClick={() => void setApproved(true)} disabled={busy}>
                  <CheckCircle2 className="size-4" />
                  {t.approveSyllabus}
                </Button>
              )}
              <DeleteButton
                name={course.title}
                body={t.deleteCourseBody}
                onConfirm={() => void remove()}
              />
            </div>
          </header>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t.syllabus}
            </h2>
            {!course.syllabusApproved && (
              <p className="text-sm text-muted-foreground">{t.syllabusHint}</p>
            )}
            <ol className="flex flex-col gap-3">
              {course.lessons.map((lesson) => (
                <SyllabusWeek
                  key={lesson.id}
                  lesson={lesson}
                  approved={course.syllabusApproved}
                  onSaved={replaceLesson}
                  onError={setError}
                />
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
