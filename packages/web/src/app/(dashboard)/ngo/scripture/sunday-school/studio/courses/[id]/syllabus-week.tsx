'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  sundaySchoolSyllabusWeekSchema,
  type SundaySchoolLessonSummary,
  type SundaySchoolSyllabusWeek,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useStudioT } from '../../messages';
import { API, Field, LessonStatusBadge, errorMessage, lessonHref } from '../../shared';

const pick = (l: SundaySchoolLessonSummary): SundaySchoolSyllabusWeek => ({
  title: l.title,
  passage: l.passage,
  bigIdea: l.bigIdea,
  learningObjective: l.learningObjective,
});

/** One week: editable while the syllabus is open, a link to the lesson once approved. */
export function SyllabusWeek({
  lesson,
  approved,
  onSaved,
  onError,
}: {
  lesson: SundaySchoolLessonSummary;
  approved: boolean;
  onSaved: (lesson: SundaySchoolLessonSummary) => void;
  onError: (message: string | null) => void;
}) {
  const t = useStudioT();
  const [form, setForm] = useState(() => pick(lesson));
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(pick(lesson)), [lesson]);

  const dirty = JSON.stringify(form) !== JSON.stringify(pick(lesson));
  const set = (key: keyof SundaySchoolSyllabusWeek, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const parsed = sundaySchoolSyllabusWeekSchema.safeParse(form);
    if (!parsed.success) {
      onError(t.invalid);
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch<{ data: SundaySchoolLessonSummary }>(
        `${API}/lessons/${lesson.id}/outline`,
        { method: 'PUT', body: JSON.stringify(parsed.data) },
      );
      onError(null);
      onSaved(res.data);
    } catch (err) {
      onError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  const heading = (
    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
      {t.week(lesson.weekNumber)}
    </span>
  );

  if (approved) {
    const ReviewIcon = lesson.reviewPassed ? ShieldCheck : ShieldAlert;
    return (
      <li className="group relative flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {heading}
          <Link
            href={lessonHref(lesson.id)}
            className="truncate text-sm font-medium after:absolute after:inset-0 focus-visible:outline-none"
          >
            {lesson.title}
          </Link>
          <span className="truncate text-xs text-muted-foreground">{lesson.passage}</span>
        </div>
        {lesson.reviewPassed !== null && (
          <ReviewIcon
            className={`size-4 shrink-0 ${lesson.reviewPassed ? 'text-emerald-600' : 'text-amber-600'}`}
            aria-label={lesson.reviewPassed ? t.reviewPassed : t.reviewNeeds}
          />
        )}
        <LessonStatusBadge status={lesson.status} />
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </li>
    );
  }

  const id = (key: string) => `w${lesson.weekNumber}-${key}`;
  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      {heading}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Field id={id('title')} label={t.lessonTitle}>
          <Input
            id={id('title')}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>
        <Field id={id('passage')} label={t.passage}>
          <Input
            id={id('passage')}
            value={form.passage}
            onChange={(e) => set('passage', e.target.value)}
          />
        </Field>
      </div>
      <Field id={id('idea')} label={t.bigIdea}>
        <Textarea
          id={id('idea')}
          rows={2}
          value={form.bigIdea}
          onChange={(e) => set('bigIdea', e.target.value)}
        />
      </Field>
      <Field id={id('objective')} label={t.objective}>
        <Textarea
          id={id('objective')}
          rows={2}
          value={form.learningObjective}
          onChange={(e) => set('learningObjective', e.target.value)}
        />
      </Field>
      {dirty && (
        <Button size="sm" className="w-fit" onClick={() => void save()} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {t.save}
        </Button>
      )}
    </li>
  );
}
