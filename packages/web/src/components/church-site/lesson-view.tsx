'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import {
  wisdomCoursePath,
  type WisdomMemberModule,
  type WisdomQuestionInsight,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { SignInCard } from '@/components/church-site/sign-in-card';
import { useWisdomSiteT } from '@/components/church-site/wisdom-messages';
import {
  DiscussionStep,
  PerspectivesStep,
  QuestionsStep,
  SummaryStep,
  TensionStep,
} from '@/components/church-site/wisdom-steps';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { cn } from '@/lib/utils';

const STEPS = ['questions', 'perspectives', 'tension', 'discussion', 'summary'] as const;
type Step = (typeof STEPS)[number];

/** One lesson of a published course, step by step; answers save as the member moves on. */
export function LessonView({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const t = useWisdomSiteT();
  const path = wisdomCoursePath(courseId);
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<WisdomMemberModule | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [insights, setInsights] = useState<WisdomQuestionInsight[]>([]);
  const [step, setStep] = useState<Step>('questions');
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [failed, setFailed] = useState(false);
  const api = `/api/v1/wisdom/modules/${moduleId}`;

  const loadInsight = useCallback(async () => {
    try {
      setInsights((await authFetch<{ data: WisdomQuestionInsight[] }>(`${api}/insight`)).data);
    } catch {
      // Others' answers are a bonus; the lesson works without them.
    }
  }, [api]);

  useEffect(() => {
    if (!user) return;
    authFetch<{ data: WisdomMemberModule }>(api)
      .then((res) => {
        setData(res.data);
        setAnswers(res.data.answers);
      })
      .catch(() => setFailed(true));
    void loadInsight();
  }, [user, api, loadInsight]);

  const onAnswer = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setDirty(true);
    setStatus('idle');
  };

  const save = async (completed = false): Promise<boolean> => {
    if (!dirty && !completed) return true;
    setStatus('saving');
    try {
      const res = await authFetch<{ data: WisdomMemberModule }>(`${api}/answers`, {
        method: 'PUT',
        body: JSON.stringify({ answers, completed }),
      });
      setData(res.data);
      setDirty(false);
      setStatus('saved');
      if (step === 'questions') void loadInsight();
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  };

  const go = async (next: Step) => {
    if (await save()) {
      setStep(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const index = STEPS.indexOf(step);
  const prev = STEPS[index - 1];
  const next = STEPS[index + 1];
  const lesson = data?.module;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <Link
        href={path}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.allLessons}
      </Link>

      {isLoading || (user && !data && !failed) ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : !user ? (
        <SignInCard prompt={t.signInPrompt} label={t.signIn} returnTo={`${path}/${moduleId}`} />
      ) : failed || !data || !lesson ? (
        <p className="text-sm text-destructive">{t.loadFailed}</p>
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
            {lesson.subtitle && <p className="mt-2 text-muted-foreground">{lesson.subtitle}</p>}
          </div>

          <ol className="flex flex-wrap gap-2" aria-label={t.wisdomName}>
            {STEPS.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => void go(s)}
                  aria-current={s === step ? 'step' : undefined}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm',
                    s === step
                      ? 'border-primary bg-primary text-primary-foreground'
                      : i < index
                        ? 'border-primary/40 text-primary'
                        : 'text-muted-foreground hover:border-primary',
                  )}
                >
                  {i + 1}. {t.steps[s]}
                </button>
              </li>
            ))}
          </ol>

          <section className="rounded-lg border p-5 sm:p-6">
            <h2 className="mb-5 text-xl font-semibold">{t.steps[step]}</h2>
            {step === 'questions' && (
              <QuestionsStep
                module={lesson}
                answers={answers}
                saved={data.answers}
                insights={insights}
                onAnswer={onAnswer}
              />
            )}
            {step === 'perspectives' && <PerspectivesStep module={lesson} />}
            {step === 'tension' && <TensionStep module={lesson} />}
            {step === 'discussion' && (
              <DiscussionStep module={lesson} answers={answers} onAnswer={onAnswer} />
            )}
            {step === 'summary' && (
              <SummaryStep module={lesson} answers={answers} onAnswer={onAnswer} />
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            {prev && (
              <Button variant="outline" onClick={() => void go(prev)}>
                {t.previous}
              </Button>
            )}
            {(step === 'questions' || step === 'discussion' || step === 'summary') && (
              <Button variant="outline" onClick={() => void save()} disabled={!dirty}>
                {t.save}
              </Button>
            )}
            <span className="text-sm text-muted-foreground" role="status">
              {status === 'saving' && t.saving}
              {status === 'saved' && t.saved}
              {status === 'error' && <span className="text-destructive">{t.saveFailed}</span>}
            </span>
            <div className="ml-auto">
              {next ? (
                <Button onClick={() => void go(next)}>{t.next}</Button>
              ) : data.completed ? (
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="size-5" />
                  {t.finished}
                </span>
              ) : (
                <Button onClick={() => void save(true)}>{t.finish}</Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
