'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, Undo2 } from 'lucide-react';
import {
  SS_DELIVERY_FORMATS,
  SS_METHODOLOGIES,
  saveSundaySchoolLessonSchema,
  totalMinutes,
  type SaveSundaySchoolLessonData,
  type SsLessonStatus,
  type SundaySchoolLessonDetail,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/auth';
import { useStudioT } from '../../messages';
import { useOptionLabels } from '../../options';
import {
  API,
  EnumSelect,
  ErrorBanner,
  Field,
  LessonStatusBadge,
  courseHref,
  errorMessage,
  useIsStudioEditor,
} from '../../shared';
import { BlocksEditor } from './blocks-editor';
import { PreparePanel } from './prepare-panel';
import { ExegesisPanel, ReviewPanel } from './study-panels';

const toDraft = (l: SundaySchoolLessonDetail): SaveSundaySchoolLessonData => ({
  title: l.title,
  passage: l.passage,
  bigIdea: l.bigIdea,
  learningObjective: l.learningObjective,
  methodology: l.methodology,
  participationLevel: l.participationLevel,
  deliveryFormat: l.deliveryFormat,
  targetDurationMinutes: l.targetDurationMinutes,
  blocks: l.blocks,
  status: l.status,
});

const PARTICIPATION = ['1', '2', '3', '4', '5'] as const;
type Participation = (typeof PARTICIPATION)[number];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Staff: prepare one lesson with AI, edit its plan, and approve it for class. */
export default function StudioLessonPage() {
  const t = useStudioT();
  const o = useOptionLabels();
  const { id } = useParams<{ id: string }>();
  const isEditor = useIsStudioEditor();
  const [lesson, setLesson] = useState<SundaySchoolLessonDetail | null>(null);
  const [draft, setDraft] = useState<SaveSundaySchoolLessonData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (next: SundaySchoolLessonDetail) => {
    setLesson(next);
    setDraft(toDraft(next));
  };

  const load = useCallback(async () => {
    try {
      accept((await authFetch<{ data: SundaySchoolLessonDetail }>(`${API}/lessons/${id}`)).data);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  }, [id, t.failed]);

  useEffect(() => {
    if (isEditor) void load();
  }, [isEditor, load]);

  const save = async (status?: SsLessonStatus) => {
    if (!draft) return;
    const parsed = saveSundaySchoolLessonSchema.safeParse({
      ...draft,
      status: status ?? draft.status,
    });
    if (!parsed.success) {
      setError(t.invalid);
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch<{ data: SundaySchoolLessonDetail }>(`${API}/lessons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(parsed.data),
      });
      accept(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  const set = <K extends keyof SaveSundaySchoolLessonData>(
    key: K,
    value: SaveSundaySchoolLessonData[K],
  ) => setDraft((d) => d && { ...d, [key]: value });

  const participationLabels = Object.fromEntries(
    PARTICIPATION.map((n) => [n, `${n} · ${t.participationLevels[Number(n)] ?? ''}`]),
  ) as Record<Participation, string>;

  const dirty = !!lesson && !!draft && JSON.stringify(draft) !== JSON.stringify(toDraft(lesson));

  return (
    <div className="flex min-w-0 flex-col gap-6 p-6">
      {lesson && (
        <Link
          href={courseHref(lesson.courseId)}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t.backToCourse}
        </Link>
      )}
      {!isEditor && <p className="text-sm text-muted-foreground">{t.noAccess}</p>}
      <ErrorBanner message={error} />
      {isEditor && !lesson && !error && (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      )}
      {lesson && draft && (
        <>
          <header className="flex flex-wrap items-start gap-3 border-b border-border/60 pb-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {lesson.courseTitle} · {t.week(lesson.weekNumber)}
              </span>
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
                {lesson.title}
                <LessonStatusBadge status={lesson.status} />
              </h1>
              <p className="text-sm font-medium">{lesson.passage}</p>
              <p className="text-sm text-muted-foreground">{lesson.bigIdea}</p>
              <p className="text-xs text-muted-foreground">
                {t.objective}：{lesson.learningObjective}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dirty && (
                <Button onClick={() => void save()} disabled={busy}>
                  {t.save}
                </Button>
              )}
              {lesson.status === 'approved' ? (
                <Button variant="outline" onClick={() => void save('generated')} disabled={busy}>
                  <Undo2 className="size-4" />
                  {t.unapprove}
                </Button>
              ) : (
                <Button
                  variant={dirty ? 'outline' : 'default'}
                  onClick={() => void save('approved')}
                  disabled={busy || draft.blocks.length === 0}
                >
                  <CheckCircle2 className="size-4" />
                  {t.approveLesson}
                </Button>
              )}
            </div>
          </header>

          <Section title={t.settings}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field id="ls-method" label={t.methodology}>
                <EnumSelect
                  id="ls-method"
                  value={draft.methodology}
                  options={SS_METHODOLOGIES}
                  labels={o.methodology}
                  onChange={(v) => set('methodology', v)}
                />
              </Field>
              <Field id="ls-part" label={t.participation}>
                <EnumSelect
                  id="ls-part"
                  value={String(draft.participationLevel) as Participation}
                  options={PARTICIPATION}
                  labels={participationLabels}
                  onChange={(v) => set('participationLevel', Number(v))}
                />
              </Field>
              <Field id="ls-delivery" label={t.delivery}>
                <EnumSelect
                  id="ls-delivery"
                  value={draft.deliveryFormat}
                  options={SS_DELIVERY_FORMATS}
                  labels={o.delivery}
                  onChange={(v) => set('deliveryFormat', v)}
                />
              </Field>
              <Field id="ls-min" label={t.duration}>
                <Input
                  id="ls-min"
                  type="number"
                  min={10}
                  max={180}
                  value={draft.targetDurationMinutes}
                  onChange={(e) => set('targetDurationMinutes', Number(e.target.value))}
                />
              </Field>
            </div>
          </Section>

          <Section title={t.prepare}>
            <PreparePanel lesson={lesson} disabled={dirty} onUpdated={accept} onError={setError} />
          </Section>

          {lesson.exegesis && (
            <Section title={t.exegesis}>
              <ExegesisPanel exegesis={lesson.exegesis} />
            </Section>
          )}

          <Section title={t.plan}>
            <BlocksEditor
              blocks={draft.blocks}
              targetMinutes={draft.targetDurationMinutes}
              onChange={(blocks) => set('blocks', blocks)}
            />
          </Section>

          {lesson.review && (
            <Section title={t.review}>
              <ReviewPanel
                review={lesson.review}
                allocatedMinutes={totalMinutes(draft.blocks)}
                targetMinutes={draft.targetDurationMinutes}
              />
            </Section>
          )}
        </>
      )}
    </div>
  );
}
