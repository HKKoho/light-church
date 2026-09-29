'use client';

import { useEffect, useState } from 'react';
import {
  WISDOM_PERSPECTIVES,
  saveWisdomCourseSchema,
  wisdomReadingName,
  type WisdomCourseInfo,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useWisdomT } from './messages';
import { ErrorBanner, Field, errorMessage } from './shared';

interface Form {
  title: string;
  description: string;
  readingLabels: string[];
  sortOrder: number;
}

/**
 * Create a course on the Wisdom in Bible template (`course` = 'new') or edit
 * one; `null` keeps the dialog closed. New courses start with Wisdom in
 * Bible's reading names, ready to rename.
 */
export function CourseDialog({
  course,
  nextOrder = 0,
  onClose,
  onSaved,
}: {
  course: WisdomCourseInfo | 'new' | null;
  nextOrder?: number;
  onClose: () => void;
  onSaved: (course: WisdomCourseInfo) => void;
}) {
  const t = useWisdomT();
  const template = (labels: readonly string[]) =>
    WISDOM_PERSPECTIVES.map((type) => wisdomReadingName(labels, type, t.perspectiveNames));
  const [form, setForm] = useState<Form>({
    title: '',
    description: '',
    readingLabels: template([]),
    sortOrder: nextOrder,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (course === 'new') {
      setForm({ title: '', description: '', readingLabels: template([]), sortOrder: nextOrder });
    } else if (course) {
      setForm({
        title: course.title,
        description: course.description,
        readingLabels: template(course.readingLabels),
        sortOrder: course.sortOrder,
      });
    }
    // `template` only reads the language's names; reset when the dialog opens.
  }, [course, nextOrder]);

  const save = async () => {
    const parsed = saveWisdomCourseSchema.safeParse(form);
    if (!parsed.success) {
      setError(t.invalid);
      return;
    }
    setBusy(true);
    try {
      const editing = course && course !== 'new';
      const res = await authFetch<{ data: WisdomCourseInfo }>(
        `/api/v1/wisdom/admin/courses${editing ? `/${course.id}` : ''}`,
        { method: editing ? 'PUT' : 'POST', body: JSON.stringify(parsed.data) },
      );
      onSaved(res.data);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  const setLabel = (i: number, value: string) =>
    setForm({ ...form, readingLabels: form.readingLabels.map((l, j) => (j === i ? value : l)) });

  return (
    <Dialog open={!!course} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{course === 'new' ? t.newCourse : t.editCourse}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ErrorBanner message={error} />
          <Field id="course-title" label={t.courseTitle}>
            <Input
              id="course-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field id="course-description" label={t.courseDescription}>
            <Textarea
              id="course-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">{t.readingLabels}</legend>
            <DialogDescription className="text-xs">{t.readingLabelsHint}</DialogDescription>
            {form.readingLabels.map((label, i) => (
              <Input
                key={i}
                aria-label={t.readingSlot(i + 1)}
                placeholder={t.readingSlot(i + 1)}
                value={label}
                onChange={(e) => setLabel(i, e.target.value)}
              />
            ))}
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
