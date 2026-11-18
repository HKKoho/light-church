// packages/api/src/sunday-school/sunday-school.parsers.ts
//
// Turns the AI roles' JSON replies into validated Studio data. Replies may
// wrap JSON in prose or code fences, or use LogosCraft's block names; bad
// items are dropped rather than failing the whole reply when enough is left.
import { BadGatewayException } from '@nestjs/common';
import {
  SS_BLOCK_TYPES,
  normalizePacing,
  sundaySchoolBlockSchema,
  sundaySchoolExegesisSchema,
  sundaySchoolSyllabusDraftSchema,
  sundaySchoolSyllabusWeekSchema,
  sundaySchoolWordNoteSchema,
  totalMinutes,
  type SsBlockType,
  type SundaySchoolBlock,
  type SundaySchoolCheck,
  type SundaySchoolExegesis,
  type SundaySchoolReview,
  type SundaySchoolSyllabusDraft,
} from '@clawix/shared';
import { randomUUID } from 'node:crypto';

/** Allowed gap, in minutes, between the blocks' total and the lesson length. */
export const PACING_TOLERANCE = 2;

type Obj = Record<string, unknown>;

const asObj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {});
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asText = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** The first `{ … }` in the reply, parsed. */
export function extractJson(reply: string, what: string): Obj {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new BadGatewayException(`The AI reply did not contain ${what} — please try again`);
  }
  try {
    return asObj(JSON.parse(reply.slice(start, end + 1)));
  } catch {
    throw new BadGatewayException(`The AI ${what} was not valid JSON — please try again`);
  }
}

export function parseSyllabus(reply: string, weeks: number): SundaySchoolSyllabusDraft {
  const raw = extractJson(reply, 'a syllabus');
  const kept = asArray(raw['weeks'])
    .map((w) => sundaySchoolSyllabusWeekSchema.safeParse(w))
    .flatMap((r) => (r.success ? [r.data] : []))
    .slice(0, weeks);
  const result = sundaySchoolSyllabusDraftSchema.safeParse({
    courseTitle: raw['courseTitle'],
    weeks: kept,
  });
  if (!result.success) {
    throw new BadGatewayException('The AI syllabus was incomplete — please try again');
  }
  return result.data;
}

export function parseExegesis(reply: string): SundaySchoolExegesis {
  const raw = extractJson(reply, 'passage notes');
  const wordNotes = asArray(raw['wordNotes'])
    .map((n) => {
      const note = asObj(n);
      const hebrew = asText(note['language']).toLowerCase().startsWith('heb');
      return { ...note, language: hebrew ? 'Hebrew' : 'Greek' };
    })
    .filter((n) => sundaySchoolWordNoteSchema.safeParse(n).success);
  const keyVerses = asArray(raw['keyVerses']).filter(
    (v) => asText(asObj(v)['reference']) && asText(asObj(v)['gist']),
  );
  const result = sundaySchoolExegesisSchema.safeParse({
    historicalContext: raw['historicalContext'],
    theologicalAnchors: asArray(raw['theologicalAnchors'])
      .filter((a) => asText(a))
      .slice(0, 6),
    keyVerses: keyVerses.slice(0, 8),
    crossReferences: asArray(raw['crossReferences'])
      .filter((c) => asText(c))
      .slice(0, 8),
    wordNotes: wordNotes.slice(0, 5),
  });
  if (!result.success) {
    throw new BadGatewayException('The AI passage notes were incomplete — please try again');
  }
  return result.data;
}

/** LogosCraft's names, and common variants, for each block type. */
const BLOCK_ALIASES: Record<string, SsBlockType> = {
  scripturereading: 'scripture',
  reading: 'scripture',
  discussionquestion: 'discussion',
  question: 'discussion',
  applicationprayer: 'application',
  prayer: 'application',
  look: 'illustration',
  took: 'application',
};

export function toBlockType(value: unknown): SsBlockType {
  const key = asText(value)
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if ((SS_BLOCK_TYPES as readonly string[]).includes(key)) return key as SsBlockType;
  return BLOCK_ALIASES[key] ?? 'book';
}

/** Teaching blocks, timed to add up to `targetMinutes`. */
export function parseBlocks(reply: string, targetMinutes: number): SundaySchoolBlock[] {
  const raw = extractJson(reply, 'a lesson plan');
  const blocks = asArray(raw['blocks'])
    .map((b) => {
      const block = asObj(b);
      return sundaySchoolBlockSchema.safeParse({
        ...block,
        id: randomUUID(),
        type: toBlockType(block['type']),
        durationMinutes: Number(block['durationMinutes']) || 5,
        content: asText(block['content']),
        teacherNotes: asText(block['teacherNotes']),
        studentPrompt: asText(block['studentPrompt']),
        studentAnswerKey: asText(block['studentAnswerKey']),
      });
    })
    .flatMap((r) => (r.success ? [r.data] : []))
    .slice(0, 12);
  if (blocks.length < 3) {
    throw new BadGatewayException('The AI lesson plan was incomplete — please try again');
  }
  return normalizePacing(blocks, targetMinutes);
}

function toCheck(value: unknown): SundaySchoolCheck {
  const check = asObj(value);
  const status = asText(check['status']).toLowerCase();
  return {
    status: status.startsWith('verif') || status === 'pass' ? 'verified' : 'needs_review',
    detail: asText(check['detail']).slice(0, 2000),
  };
}

/** The Reviewer's three checks, plus a pacing check worked out here. */
export function parseReview(
  reply: string,
  blocks: readonly SundaySchoolBlock[],
  targetMinutes: number,
): SundaySchoolReview {
  const raw = extractJson(reply, 'review');
  const allocated = totalMinutes(blocks);
  const pacingOk = Math.abs(allocated - targetMinutes) <= PACING_TOLERANCE;
  const verseAccuracy = toCheck(raw['verseAccuracy']);
  const ageFit = toCheck(raw['ageFit']);
  const doctrine = toCheck(raw['doctrine']);
  return {
    passed: pacingOk && [verseAccuracy, ageFit, doctrine].every((c) => c.status === 'verified'),
    verseAccuracy,
    ageFit,
    doctrine,
    pacing: {
      status: pacingOk ? 'verified' : 'needs_review',
      detail: '',
      allocatedMinutes: allocated,
      targetMinutes,
    },
    summary: asText(raw['summary']).slice(0, 3000),
  };
}
