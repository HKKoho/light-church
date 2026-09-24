'use client';

import { Trash2 } from 'lucide-react';
import { SURVEY_QUESTION_TYPES, type SurveyQuestion } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SurveyT } from './messages';

const isChoice = (q: SurveyQuestion) => q.type === 'single' || q.type === 'multiple';

interface QuestionEditorProps {
  readonly index: number;
  readonly question: SurveyQuestion;
  readonly t: SurveyT;
  readonly onChange: (q: SurveyQuestion) => void;
  readonly onRemove: () => void;
}

/** One editable question in the AI Survey draft. */
export function QuestionEditor({ index, question, t, onChange, onRemove }: QuestionEditorProps) {
  const id = `q${index}`;
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${id}-title`} className="text-xs text-muted-foreground">
          {t.question(index + 1)}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={t.remove}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <Input
        id={`${id}-title`}
        value={question.title}
        maxLength={300}
        onChange={(e) => {
          onChange({ ...question, title: e.target.value });
        }}
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t.type}</span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={question.type}
            onChange={(e) => {
              onChange({ ...question, type: e.target.value as SurveyQuestion['type'] });
            }}
          >
            {SURVEY_QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t.types[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={question.required}
            onChange={(e) => {
              onChange({ ...question, required: e.target.checked });
            }}
          />
          {t.required}
        </label>
      </div>
      {isChoice(question) && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-options`} className="text-xs text-muted-foreground">
            {t.options}
          </Label>
          <Textarea
            id={`${id}-options`}
            rows={Math.max(3, question.options.length + 1)}
            value={question.options.join('\n')}
            onChange={(e) => {
              onChange({ ...question, options: e.target.value.split('\n') });
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Trims text and blank choices so the draft passes the server's validation. */
export function cleanQuestion(q: SurveyQuestion): SurveyQuestion {
  return {
    ...q,
    title: q.title.trim(),
    options: isChoice(q) ? q.options.map((o) => o.trim()).filter(Boolean) : [],
  };
}
