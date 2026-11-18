'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';
import {
  SS_GENERATION_STAGES,
  type SsGenerationStage,
  type SundaySchoolLessonDetail,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { useStudioT } from '../../messages';
import { API, errorMessage } from '../../shared';

const isDone = (lesson: SundaySchoolLessonDetail, stage: SsGenerationStage) =>
  stage === 'exegete'
    ? lesson.exegesis !== null
    : stage === 'pedagogue'
      ? lesson.blocks.length > 0
      : lesson.review !== null;

/** The three AI steps, run one request each so progress shows as it goes. */
export function PreparePanel({
  lesson,
  disabled,
  onUpdated,
  onError,
}: {
  lesson: SundaySchoolLessonDetail;
  /** E.g. while there are unsaved edits that a step would overwrite. */
  disabled: boolean;
  onUpdated: (lesson: SundaySchoolLessonDetail) => void;
  onError: (message: string | null) => void;
}) {
  const t = useStudioT();
  const [running, setRunning] = useState<SsGenerationStage | null>(null);

  const run = async (stages: readonly SsGenerationStage[]) => {
    onError(null);
    try {
      for (const stage of stages) {
        setRunning(stage);
        const res = await authFetch<{ data: SundaySchoolLessonDetail }>(
          `${API}/lessons/${lesson.id}/prepare`,
          { method: 'POST', body: JSON.stringify({ stage }) },
        );
        onUpdated(res.data);
      }
    } catch (err) {
      onError(errorMessage(err, t.failed));
    } finally {
      setRunning(null);
    }
  };

  if (!lesson.syllabusApproved) {
    return <p className="text-sm text-muted-foreground">{t.needsSyllabus}</p>;
  }

  const busy = running !== null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void run(SS_GENERATION_STAGES)} disabled={busy || disabled}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {t.prepareAll}
        </Button>
        <p className="text-xs text-muted-foreground">{disabled ? t.unsaved : t.prepareHint}</p>
      </div>
      <ol className="grid gap-2 md:grid-cols-3">
        {SS_GENERATION_STAGES.map((stage, i) => {
          const done = isDone(lesson, stage);
          const [name, desc] = t.stages[stage];
          const Icon = running === stage ? Loader2 : done ? CheckCircle2 : Circle;
          return (
            <li key={stage} className="flex items-start gap-3 rounded-lg border p-3">
              <Icon
                className={`mt-0.5 size-4 shrink-0 ${running === stage ? 'animate-spin' : ''} ${done ? 'text-emerald-600' : 'text-muted-foreground'}`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium">
                  {i + 1}. {name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {running === stage ? t.running : desc}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void run([stage])}
                disabled={busy || disabled}
              >
                {done ? t.rerun : t.run}
              </Button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
