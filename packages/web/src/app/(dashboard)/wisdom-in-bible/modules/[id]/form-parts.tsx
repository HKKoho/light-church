'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import {
  WISDOM_PERSPECTIVES,
  WISDOM_QUESTION_TYPES,
  type WisdomPerspective,
  type WisdomPerspectiveType,
  type WisdomQuestionType,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useWisdomT } from '../../messages';
import { Field } from '../../shared';

/** A life question as edited: choices are one per line until saved. */
export interface QuestionForm {
  id?: string;
  text: string;
  type: WisdomQuestionType;
  optionsText: string;
  mediaUrl: string;
  imageUrl: string;
  imageAlt: string;
}

export const emptyQuestion = (): QuestionForm => ({
  text: '',
  type: 'open',
  optionsText: '',
  mediaUrl: '',
  imageUrl: '',
  imageAlt: '',
});

function move<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

/** Up / down / remove controls for one item of a list. */
function ItemControls({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const t = useWisdomT();
  return (
    <div className="flex shrink-0 gap-0.5">
      <Button
        size="icon"
        variant="ghost"
        aria-label={t.moveUp}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label={t.moveDown}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
      >
        <ArrowDown className="size-4" />
      </Button>
      <Button size="icon" variant="ghost" aria-label={t.remove} onClick={onRemove}>
        <X className="size-4" />
      </Button>
    </div>
  );
}

export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

export function QuestionsEditor({
  questions,
  onChange,
}: {
  questions: readonly QuestionForm[];
  onChange: (next: QuestionForm[]) => void;
}) {
  const t = useWisdomT();
  const update = (i: number, patch: Partial<QuestionForm>) =>
    onChange(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <Section title={t.lifeQuestions} hint={t.lifeQuestionsHint}>
      {questions.map((q, i) => (
        <div key={q.id ?? `new-${i}`} className="flex flex-col gap-3 rounded-md border p-3">
          <div className="flex items-start gap-2">
            <Field id={`q-${i}`} label={`${t.question} ${i + 1}`} className="flex-1">
              <Textarea
                id={`q-${i}`}
                value={q.text}
                onChange={(e) => update(i, { text: e.target.value })}
              />
            </Field>
            <ItemControls
              index={i}
              count={questions.length}
              onMove={(to) => onChange(move(questions, i, to))}
              onRemove={() => onChange(questions.filter((_, j) => j !== i))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.questionType}>
              <Select
                value={q.type}
                onValueChange={(v) => update(i, { type: v as WisdomQuestionType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WISDOM_QUESTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t.questionTypes[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id={`q-media-${i}`} label={t.mediaUrl}>
              <Input
                id={`q-media-${i}`}
                value={q.mediaUrl}
                placeholder="https://"
                onChange={(e) => update(i, { mediaUrl: e.target.value })}
              />
            </Field>
            {q.type === 'multi_choice' && (
              <Field id={`q-options-${i}`} label={t.options} className="sm:col-span-2">
                <Textarea
                  id={`q-options-${i}`}
                  value={q.optionsText}
                  onChange={(e) => update(i, { optionsText: e.target.value })}
                />
              </Field>
            )}
            <Field id={`q-image-${i}`} label={t.imageUrl}>
              <Input
                id={`q-image-${i}`}
                value={q.imageUrl}
                placeholder="https://"
                onChange={(e) => update(i, { imageUrl: e.target.value })}
              />
            </Field>
            <Field id={`q-alt-${i}`} label={t.imageAlt}>
              <Input
                id={`q-alt-${i}`}
                value={q.imageAlt}
                onChange={(e) => update(i, { imageAlt: e.target.value })}
              />
            </Field>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        className="self-start"
        onClick={() => onChange([...questions, emptyQuestion()])}
      >
        <Plus className="size-4" />
        {t.addQuestion}
      </Button>
    </Section>
  );
}

export function PerspectivesEditor({
  perspectives,
  onChange,
}: {
  perspectives: Record<WisdomPerspectiveType, WisdomPerspective>;
  onChange: (next: Record<WisdomPerspectiveType, WisdomPerspective>) => void;
}) {
  const t = useWisdomT();
  const update = (type: WisdomPerspectiveType, patch: Partial<WisdomPerspective>) =>
    onChange({ ...perspectives, [type]: { ...perspectives[type], ...patch } });

  return (
    <Section title={t.perspectives}>
      {WISDOM_PERSPECTIVES.map((type) => {
        const p = perspectives[type];
        const field = (
          key: 'book' | 'theme' | 'imageUrl' | 'imageAlt' | 'audioUrl',
          label: string,
        ) => (
          <Field id={`${type}-${key}`} label={label}>
            <Input
              id={`${type}-${key}`}
              value={p[key]}
              onChange={(e) => update(type, { [key]: e.target.value })}
            />
          </Field>
        );
        return (
          <div key={type} className="flex flex-col gap-3 rounded-md border p-3">
            <h3 className="text-sm font-semibold">{t.perspectiveNames[type]}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {field('book', t.book)}
              {field('theme', t.theme)}
            </div>
            <Field id={`${type}-description`} label={t.description}>
              <Textarea
                id={`${type}-description`}
                rows={6}
                value={p.description}
                onChange={(e) => update(type, { description: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              {field('imageUrl', t.imageUrl)}
              {field('imageAlt', t.imageAlt)}
              {field('audioUrl', t.audioUrl)}
            </div>
          </div>
        );
      })}
    </Section>
  );
}

export function PromptsEditor({
  prompts,
  onChange,
}: {
  prompts: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const t = useWisdomT();
  return (
    <Section title={t.discussionPrompts}>
      {prompts.map((prompt, i) => (
        <div key={i} className="flex items-start gap-2">
          <Field id={`prompt-${i}`} label={`${t.prompt} ${i + 1}`} className="flex-1">
            <Textarea
              id={`prompt-${i}`}
              value={prompt}
              onChange={(e) => onChange(prompts.map((p, j) => (j === i ? e.target.value : p)))}
            />
          </Field>
          <ItemControls
            index={i}
            count={prompts.length}
            onMove={(to) => onChange(move(prompts, i, to))}
            onRemove={() => onChange(prompts.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <Button variant="outline" className="self-start" onClick={() => onChange([...prompts, ''])}>
        <Plus className="size-4" />
        {t.addPrompt}
      </Button>
    </Section>
  );
}
