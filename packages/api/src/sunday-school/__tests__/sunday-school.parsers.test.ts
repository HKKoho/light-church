// packages/api/src/sunday-school/__tests__/sunday-school.parsers.test.ts
import { BadGatewayException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  extractJson,
  parseBlocks,
  parseExegesis,
  parseReview,
  parseSyllabus,
  toBlockType,
} from '../sunday-school.parsers.js';
import { block } from './fixtures.js';

const week = (n: number) => ({
  title: `Week ${n}`,
  passage: `Jonah ${n}`,
  bigIdea: 'Idea',
  learningObjective: 'Objective',
});

describe('extractJson', () => {
  it('reads JSON wrapped in prose and fences', () => {
    expect(extractJson('Sure:\n```json\n{"a": 1}\n```', 'x')).toEqual({ a: 1 });
  });

  it('rejects replies without JSON or with broken JSON', () => {
    expect(() => extractJson('no json here', 'a syllabus')).toThrow(BadGatewayException);
    expect(() => extractJson('{"a": }', 'a syllabus')).toThrow(/not valid JSON/);
  });

  it('treats a non-object reply as empty', () => {
    expect(extractJson('{} trailing', 'x')).toEqual({});
  });
});

describe('parseSyllabus', () => {
  it('keeps valid weeks up to the requested count', () => {
    const reply = JSON.stringify({
      courseTitle: 'Jonah',
      weeks: [week(1), { title: 'broken' }, week(2), week(3)],
    });
    const draft = parseSyllabus(reply, 2);
    expect(draft.courseTitle).toBe('Jonah');
    expect(draft.weeks.map((w) => w.title)).toEqual(['Week 1', 'Week 2']);
  });

  it('fails when no week survives', () => {
    expect(() => parseSyllabus('{"courseTitle": "X", "weeks": []}', 4)).toThrow(/incomplete/);
    expect(() => parseSyllabus('{"weeks": "nope"}', 4)).toThrow(/incomplete/);
  });
});

describe('parseExegesis', () => {
  it('normalises word-note languages and drops bad items', () => {
    const notes = parseExegesis(
      JSON.stringify({
        historicalContext: 'Nineveh was Assyria’s capital.',
        theologicalAnchors: ['God is merciful', '', 3],
        keyVerses: [{ reference: 'Jonah 4:2', gist: 'Jonah knows God is gracious' }, { gist: 'x' }],
        crossReferences: ['Exodus 34:6', ''],
        wordNotes: [
          { term: 'חֶסֶד', language: 'hebrew', meaning: 'steadfast love' },
          { term: 'λόγος', language: 'Koine', meaning: 'word' },
          { term: 'missing meaning', language: 'Greek' },
        ],
      }),
    );
    expect(notes.theologicalAnchors).toEqual(['God is merciful']);
    expect(notes.keyVerses).toHaveLength(1);
    expect(notes.crossReferences).toEqual(['Exodus 34:6']);
    expect(notes.wordNotes.map((n) => n.language)).toEqual(['Hebrew', 'Greek']);
  });

  it('fails without context or anchors', () => {
    expect(() => parseExegesis('{"theologicalAnchors": ["a"]}')).toThrow(/incomplete/);
  });
});

describe('toBlockType', () => {
  it('maps LogosCraft names and variants', () => {
    expect(toBlockType('Hook')).toBe('hook');
    expect(toBlockType('ScriptureReading')).toBe('scripture');
    expect(toBlockType('DiscussionQuestion')).toBe('discussion');
    expect(toBlockType('Application & Prayer')).toBe('application');
    expect(toBlockType('something else')).toBe('book');
    expect(toBlockType(undefined)).toBe('book');
  });
});

describe('parseBlocks', () => {
  it('assigns ids and times the blocks to the lesson length', () => {
    const reply = JSON.stringify({
      blocks: [
        { type: 'Hook', title: 'Open', durationMinutes: 10, content: 'c', teacherNotes: 't' },
        { type: 'Book', title: 'Teach', durationMinutes: 'x', content: 'c' },
        { type: 'Activity', title: 'Do', durationMinutes: 20 },
        { title: '' },
      ],
    });
    const blocks = parseBlocks(reply, 45);
    expect(blocks).toHaveLength(3);
    expect(new Set(blocks.map((b) => b.id)).size).toBe(3);
    expect(blocks.reduce((s, b) => s + b.durationMinutes, 0)).toBe(45);
    expect(blocks[1]?.teacherNotes).toBe('');
  });

  it('fails with fewer than three blocks', () => {
    expect(() => parseBlocks('{"blocks": [{"title": "only"}]}', 45)).toThrow(/incomplete/);
  });
});

describe('parseReview', () => {
  const blocks = [block({ durationMinutes: 45 })] as Parameters<typeof parseReview>[1];

  it('passes when every check is verified and pacing fits', () => {
    const review = parseReview(
      JSON.stringify({
        verseAccuracy: { status: 'Verified', detail: 'ok' },
        ageFit: { status: 'verified' },
        doctrine: { status: 'pass', detail: 'ok' },
        summary: 'Good',
      }),
      blocks,
      44,
    );
    expect(review.passed).toBe(true);
    expect(review.pacing).toMatchObject({ status: 'verified', allocatedMinutes: 45 });
  });

  it('flags a check or pacing that needs review', () => {
    const flagged = parseReview(
      '{"verseAccuracy": {"status": "Needs Review"}, "ageFit": {}, "doctrine": "x"}',
      blocks,
      45,
    );
    expect(flagged.passed).toBe(false);
    expect(flagged.verseAccuracy.status).toBe('needs_review');
    expect(flagged.summary).toBe('');

    const allVerified = {
      verseAccuracy: { status: 'verified' },
      ageFit: { status: 'verified' },
      doctrine: { status: 'verified' },
    };
    const slow = parseReview(JSON.stringify(allVerified), blocks, 60);
    expect(slow.passed).toBe(false);
    expect(slow.pacing.status).toBe('needs_review');
  });
});
