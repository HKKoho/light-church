'use client';

import { ArrowDown, ArrowUp, Plus, Scale, Trash2 } from 'lucide-react';
import {
  SS_BLOCK_TYPES,
  normalizePacing,
  totalMinutes,
  type SundaySchoolBlock,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useStudioT } from '../../messages';
import { EnumSelect, Field } from '../../shared';

const newBlock = (): SundaySchoolBlock => ({
  id: crypto.randomUUID(),
  type: 'discussion',
  title: '',
  durationMinutes: 5,
  content: '',
  teacherNotes: '',
  studentPrompt: '',
  studentAnswerKey: '',
});

/** The timed teaching blocks, editable by the teacher. */
export function BlocksEditor({
  blocks,
  targetMinutes,
  onChange,
}: {
  blocks: SundaySchoolBlock[];
  targetMinutes: number;
  onChange: (blocks: SundaySchoolBlock[]) => void;
}) {
  const t = useStudioT();
  const sum = totalMinutes(blocks);

  const update = (i: number, patch: Partial<SundaySchoolBlock>) =>
    onChange(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...blocks];
    const [item] = next.splice(i, 1);
    if (item) next.splice(i + by, 0, item);
    onChange(next);
  };

  if (blocks.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.noBlocks}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`text-sm ${Math.abs(sum - targetMinutes) <= 2 ? 'text-muted-foreground' : 'text-amber-600'}`}
        >
          {t.planTotal(sum, targetMinutes)}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange(normalizePacing(blocks, targetMinutes))}
          disabled={sum === targetMinutes}
        >
          <Scale className="size-4" />
          {t.rebalance}
        </Button>
      </div>
      <ol className="flex flex-col gap-3">
        {blocks.map((b, i) => {
          const id = (key: string) => `blk-${b.id}-${key}`;
          return (
            <li key={b.id} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="grid gap-3 sm:grid-cols-[10rem_1fr_6rem_auto] sm:items-end">
                <Field id={id('type')} label={`${i + 1}.`}>
                  <EnumSelect
                    id={id('type')}
                    value={b.type}
                    options={SS_BLOCK_TYPES}
                    labels={t.blockTypes}
                    onChange={(type) => update(i, { type })}
                  />
                </Field>
                <Field id={id('title')} label={t.blockTitle}>
                  <Input
                    id={id('title')}
                    value={b.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                  />
                </Field>
                <Field id={id('min')} label={t.blockMinutes}>
                  <Input
                    id={id('min')}
                    type="number"
                    min={1}
                    value={b.durationMinutes}
                    onChange={(e) => update(i, { durationMinutes: Number(e.target.value) || 1 })}
                  />
                </Field>
                <div className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t.moveUp}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t.moveDown}
                    disabled={i === blocks.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={t.removeBlock}
                    onClick={() => onChange(blocks.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <Field id={id('content')} label={t.blockContent}>
                  <Textarea
                    id={id('content')}
                    rows={4}
                    value={b.content}
                    onChange={(e) => update(i, { content: e.target.value })}
                  />
                </Field>
                <Field id={id('notes')} label={t.teacherNotes}>
                  <Textarea
                    id={id('notes')}
                    rows={4}
                    value={b.teacherNotes}
                    onChange={(e) => update(i, { teacherNotes: e.target.value })}
                  />
                </Field>
                <Field id={id('prompt')} label={t.studentPrompt}>
                  <Textarea
                    id={id('prompt')}
                    rows={2}
                    value={b.studentPrompt}
                    onChange={(e) => update(i, { studentPrompt: e.target.value })}
                  />
                </Field>
                <Field id={id('answer')} label={t.answerKey}>
                  <Textarea
                    id={id('answer')}
                    rows={2}
                    value={b.studentAnswerKey}
                    onChange={(e) => update(i, { studentAnswerKey: e.target.value })}
                  />
                </Field>
              </div>
            </li>
          );
        })}
      </ol>
      <Button variant="outline" className="w-fit" onClick={() => onChange([...blocks, newBlock()])}>
        <Plus className="size-4" />
        {t.addBlock}
      </Button>
    </div>
  );
}
