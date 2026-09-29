'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  WISDOM_COURSE_ID,
  WISDOM_EDITOR_ROLES,
  WISDOM_MODULE_STATUSES,
  WISDOM_PERSPECTIVES,
  saveWisdomModuleSchema,
  type WisdomAdminCycle,
  type WisdomModuleDetail,
  type WisdomModuleStatus,
  type WisdomPerspective,
  type WisdomPerspectiveType,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useWisdomT } from '../../messages';
import { courseAdminHref } from '../../routes';
import { DeleteButton, ErrorBanner, Field, errorMessage } from '../../shared';
import {
  PerspectivesEditor,
  PromptsEditor,
  QuestionsEditor,
  Section,
  type QuestionForm,
} from './form-parts';

const API = '/api/v1/wisdom/admin';

interface Form {
  cycleId: string;
  title: string;
  subtitle: string;
  sortOrder: number;
  status: WisdomModuleStatus;
  questions: QuestionForm[];
  perspectives: Record<WisdomPerspectiveType, WisdomPerspective>;
  tensionGuide: string;
  tensionGuideAudioUrl: string;
  discussionPrompts: string[];
  summary: string;
}

const emptyPerspective = (): WisdomPerspective => ({
  book: '',
  theme: '',
  description: '',
  imageUrl: '',
  imageAlt: '',
  audioUrl: '',
});

function emptyForm(cycleId: string, sortOrder: number): Form {
  return {
    cycleId,
    title: '',
    subtitle: '',
    sortOrder,
    status: 'draft',
    questions: [],
    perspectives: Object.fromEntries(
      WISDOM_PERSPECTIVES.map((p) => [p, emptyPerspective()]),
    ) as Form['perspectives'],
    tensionGuide: '',
    tensionGuideAudioUrl: '',
    discussionPrompts: [],
    summary: '',
  };
}

function toForm(m: WisdomModuleDetail): Form {
  return {
    ...m,
    questions: m.lifeQuestions.map((q) => ({ ...q, optionsText: q.options.join('\n') })),
  };
}

function toInput(f: Form) {
  return {
    ...f,
    questions: undefined,
    lifeQuestions: f.questions.map(({ optionsText, ...q }) => ({
      ...q,
      options:
        q.type === 'multi_choice'
          ? optionsText
              .split('\n')
              .map((o) => o.trim())
              .filter(Boolean)
          : [],
    })),
    discussionPrompts: f.discussionPrompts.map((p) => p.trim()).filter(Boolean),
  };
}

/** Staff: create (`/modules/new?course=…&cycle=…`) or edit a module of any course. */
export default function WisdomModulePage() {
  const t = useWisdomT();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isNew = id === 'new';
  const { user } = useAuth();
  const isEditor = !!user && WISDOM_EDITOR_ROLES.includes(user.role);
  const [cycles, setCycles] = useState<WisdomAdminCycle[]>([]);
  const [courseId, setCourseId] = useState(searchParams.get('course') ?? WISDOM_COURSE_ID);
  const [readingLabels, setReadingLabels] = useState<string[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditor) return;
    const load = async () => {
      try {
        const existing = isNew
          ? null
          : (await authFetch<{ data: WisdomModuleDetail }>(`${API}/modules/${id}`)).data;
        const course = existing?.courseId ?? searchParams.get('course') ?? WISDOM_COURSE_ID;
        const [list, info] = await Promise.all([
          authFetch<{ data: WisdomAdminCycle[] }>(`${API}/cycles?course=${course}`),
          authFetch<{ data: { readingLabels: string[] } }>(`${API}/courses/${course}`),
        ]);
        setCycles(list.data);
        setCourseId(course);
        setReadingLabels(info.data.readingLabels);
        if (existing) {
          setForm(toForm(existing));
        } else {
          const cycle = list.data.find((c) => c.id === searchParams.get('cycle')) ?? list.data[0];
          const next = Math.max(0, ...(cycle?.modules ?? []).map((m) => m.sortOrder)) + 1;
          setForm(emptyForm(cycle?.id ?? '', next));
        }
      } catch (err) {
        setError(errorMessage(err, t.notFound));
      }
    };
    void load();
  }, [isEditor, isNew, id, searchParams, t.notFound]);

  const set = (patch: Partial<Form>) => {
    setSaved(false);
    setForm((f) => (f ? { ...f, ...patch } : f));
  };

  const save = async () => {
    if (!form) return;
    const parsed = saveWisdomModuleSchema.safeParse(toInput(form));
    if (!parsed.success) {
      setError(t.invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch<{ data: WisdomModuleDetail }>(
        isNew ? `${API}/modules` : `${API}/modules/${id}`,
        { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(parsed.data) },
      );
      if (isNew) router.replace(`/wisdom-in-bible/modules/${res.data.id}`);
      else setForm(toForm(res.data));
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await authFetch(`${API}/modules/${id}`, { method: 'DELETE' });
      router.push(courseAdminHref(courseId));
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  };

  const text = (key: 'title' | 'subtitle' | 'tensionGuideAudioUrl', label: string) =>
    form && (
      <Field id={key} label={label}>
        <Input id={key} value={form[key]} onChange={(e) => set({ [key]: e.target.value })} />
      </Field>
    );
  const longText = (key: 'tensionGuide' | 'summary', label: string) =>
    form && (
      <Section title={label}>
        <Textarea
          aria-label={label}
          rows={6}
          value={form[key]}
          onChange={(e) => set({ [key]: e.target.value })}
        />
      </Section>
    );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <Link
        href={courseAdminHref(courseId)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{isNew ? t.newModule : t.editModule}</h1>

      {!isEditor ? (
        <p className="text-sm text-muted-foreground">{t.noAccess}</p>
      ) : !form ? (
        error ? (
          <ErrorBanner message={error} />
        ) : (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        )
      ) : (
        <>
          <Section title={t.module}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.cycle}>
                <Select value={form.cycleId} onValueChange={(v) => set({ cycleId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.status}>
                  <Select
                    value={form.status}
                    onValueChange={(v) => set({ status: v as WisdomModuleStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WISDOM_MODULE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t.statuses[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="order" label={t.order}>
                  <Input
                    id="order"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })}
                  />
                </Field>
              </div>
            </div>
            {text('title', t.moduleTitle)}
            {text('subtitle', t.moduleSubtitle)}
          </Section>

          <QuestionsEditor
            questions={form.questions}
            onChange={(questions) => set({ questions })}
          />
          <PerspectivesEditor
            labels={readingLabels}
            perspectives={form.perspectives}
            onChange={(perspectives) => set({ perspectives })}
          />
          {longText('tensionGuide', t.tensionGuide)}
          {text('tensionGuideAudioUrl', t.tensionGuideAudioUrl)}
          <PromptsEditor
            prompts={form.discussionPrompts}
            onChange={(discussionPrompts) => set({ discussionPrompts })}
          />
          {longText('summary', t.summary)}

          <ErrorBanner message={error} />
          <div className="sticky bottom-0 flex items-center gap-3 border-t bg-background py-3">
            <Button onClick={() => void save()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t.save}
            </Button>
            {saved && <span className="text-sm text-muted-foreground">{t.saved}</span>}
            {!isNew && (
              <div className="ml-auto">
                <DeleteButton
                  name={form.title}
                  body={t.deleteModuleBody}
                  label={t.delete}
                  onConfirm={() => void remove()}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
