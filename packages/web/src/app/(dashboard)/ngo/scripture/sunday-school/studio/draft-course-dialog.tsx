'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  SS_COURSE_MODES,
  SS_DELIVERY_FORMATS,
  SS_LANGUAGES,
  SS_MAX_WEEKS,
  SS_METHODOLOGIES,
  SS_MIN_WEEKS,
  generateSundaySchoolSyllabusSchema,
  type GenerateSundaySchoolSyllabusData,
  type SundaySchoolCourseDetail,
  type SundaySchoolProfileInfo,
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
import { authFetch } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { useStudioT } from './messages';
import { useOptionLabels } from './options';
import { API, EnumSelect, ErrorBanner, Field, errorMessage } from './shared';

/** The Dean drafts a syllabus from a book or topic for one class profile. */
export function DraftCourseDialog({
  open,
  profiles,
  onClose,
  onDrafted,
}: {
  open: boolean;
  profiles: SundaySchoolProfileInfo[];
  onClose: () => void;
  onDrafted: (course: SundaySchoolCourseDetail) => void;
}) {
  const t = useStudioT();
  const o = useOptionLabels();
  const { lang } = useLanguage();
  const blank = (): GenerateSundaySchoolSyllabusData => ({
    title: '',
    mode: 'book',
    subject: '',
    weeks: 6,
    profileId: profiles[0]?.id ?? '',
    methodology: 'inductive',
    deliveryFormat: 'in_person',
    language: lang,
  });
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(blank());
      setError(null);
    }
    // Reset only when the dialog opens.
  }, [open]);

  const set = <K extends keyof GenerateSundaySchoolSyllabusData>(
    key: K,
    value: GenerateSundaySchoolSyllabusData[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const draft = async () => {
    const parsed = generateSundaySchoolSyllabusSchema.safeParse(form);
    if (!parsed.success) {
      setError(t.invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch<{ data: SundaySchoolCourseDetail }>(`${API}/courses/draft`, {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      onDrafted(res.data);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  const profileLabels = Object.fromEntries(profiles.map((p) => [p.id, p.name]));
  const isBook = form.mode === 'book';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.draftTitle}</DialogTitle>
          <DialogDescription>{t.draftHint}</DialogDescription>
        </DialogHeader>
        <fieldset disabled={busy} className="flex flex-col gap-4">
          <ErrorBanner message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="dc-mode" label={t.mode}>
              <EnumSelect
                id="dc-mode"
                value={form.mode}
                options={SS_COURSE_MODES}
                labels={t.modes}
                onChange={(v) => set('mode', v)}
              />
            </Field>
            <Field id="dc-subject" label={isBook ? t.subjectBook : t.subjectTopic}>
              <Input
                id="dc-subject"
                placeholder={isBook ? t.bookPlaceholder : t.topicPlaceholder}
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
              />
            </Field>
          </div>
          <Field id="dc-title" label={t.workingTitle} hint={t.workingTitleHint}>
            <Input
              id="dc-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="dc-profile" label={t.profile}>
              <EnumSelect
                id="dc-profile"
                value={form.profileId}
                options={profiles.map((p) => p.id)}
                labels={profileLabels}
                onChange={(v) => set('profileId', v)}
              />
            </Field>
            <Field id="dc-weeks" label={t.weeks}>
              <Input
                id="dc-weeks"
                type="number"
                min={SS_MIN_WEEKS}
                max={SS_MAX_WEEKS}
                value={form.weeks}
                onChange={(e) => set('weeks', Number(e.target.value))}
              />
            </Field>
            <Field id="dc-method" label={t.methodology}>
              <EnumSelect
                id="dc-method"
                value={form.methodology}
                options={SS_METHODOLOGIES}
                labels={o.methodology}
                onChange={(v) => set('methodology', v)}
              />
            </Field>
            <Field id="dc-delivery" label={t.delivery}>
              <EnumSelect
                id="dc-delivery"
                value={form.deliveryFormat}
                options={SS_DELIVERY_FORMATS}
                labels={o.delivery}
                onChange={(v) => set('deliveryFormat', v)}
              />
            </Field>
            <Field id="dc-lang" label={t.language}>
              <EnumSelect
                id="dc-lang"
                value={form.language}
                options={SS_LANGUAGES}
                labels={t.languages}
                onChange={(v) => set('language', v)}
              />
            </Field>
          </div>
        </fieldset>
        <DialogFooter className="items-center">
          {busy && <p className="mr-auto text-xs text-muted-foreground">{t.drafting}</p>}
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t.cancel}
          </Button>
          <Button onClick={() => void draft()} disabled={busy || !form.subject.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {t.draft}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
