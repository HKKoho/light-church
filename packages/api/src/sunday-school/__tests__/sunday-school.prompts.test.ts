// packages/api/src/sunday-school/__tests__/sunday-school.prompts.test.ts
import { describe, expect, it } from 'vitest';

import {
  buildBlocksPrompt,
  buildExegesisPrompt,
  buildReviewPrompt,
  buildSyllabusPrompt,
  describeProfile,
  type LessonBrief,
} from '../sunday-school.prompts.js';
import { block, profileData } from './fixtures.js';

const brief = (over: Partial<LessonBrief> = {}): LessonBrief => ({
  title: 'Running from God',
  passage: 'Jonah 1',
  bigIdea: 'God pursues',
  learningObjective: 'Name a way we run',
  methodology: 'inductive',
  participationLevel: 3,
  deliveryFormat: 'in_person',
  targetDurationMinutes: 45,
  language: 'en',
  ...over,
});

const exegesis = {
  historicalContext: 'Context',
  theologicalAnchors: ['Mercy'],
  keyVerses: [{ reference: 'Jonah 1:3', gist: 'He flees' }],
  crossReferences: [],
  wordNotes: [],
};

describe('describeProfile', () => {
  it('describes the class in words and notes missing guardrails', () => {
    const text = describeProfile(profileData);
    expect(text).toContain('Mixed adults');
    expect(text).toContain('新標點和合本');
    expect(text).toContain("Believer's baptism");
    expect(describeProfile({ ...profileData, guardrails: '', description: '' })).toContain(
      'none given',
    );
  });
});

describe('buildSyllabusPrompt', () => {
  const input = {
    title: '',
    mode: 'book' as const,
    subject: 'Jonah',
    weeks: 4,
    profileId: 'p1',
    methodology: 'storytelling' as const,
    deliveryFormat: 'online' as const,
    language: 'zh-TW' as const,
  };

  it('divides a book in order and writes in Traditional Chinese', () => {
    const prompt = buildSyllabusPrompt(input, profileData);
    expect(prompt).toContain('Divide the book of Jonah across all 4 weeks');
    expect(prompt).toContain('Suggest a clear course title');
    expect(prompt).toContain('Traditional Chinese');
    expect(prompt).toContain('Online');
  });

  it('gathers passages for a topic and keeps a working title', () => {
    const prompt = buildSyllabusPrompt(
      { ...input, mode: 'topical', subject: 'Hope', title: 'Living hope', language: 'en' },
      profileData,
    );
    expect(prompt).toContain('passages from across Scripture on "Hope"');
    expect(prompt).toContain('Working title: Living hope');
    expect(prompt).toContain('in English');
  });
});

describe('lesson prompts', () => {
  it('asks the Exegete for the passage without quoting verses', () => {
    expect(buildExegesisPrompt(brief(), profileData)).toContain('Passage: Jonah 1');
  });

  it('gives the Pedagogue the notes, length and participation level', () => {
    const low = buildBlocksPrompt(brief({ participationLevel: 1 }), profileData, exegesis);
    expect(low).toContain('teacher-led');
    expect(low).toContain('add up to about 45 minutes');
    expect(low).toContain('Jonah 1:3');
    expect(buildBlocksPrompt(brief({ participationLevel: 5 }), profileData, exegesis)).toContain(
      'role play',
    );
    expect(buildBlocksPrompt(brief(), profileData, { ...exegesis, keyVerses: [] })).toContain(
      'Key verses: none',
    );
  });

  it('shows the Reviewer every block', () => {
    const prompt = buildReviewPrompt(brief(), profileData, [
      block({ type: 'hook', title: 'Opening' }) as never,
    ]);
    expect(prompt).toContain('[hook · 45 min] Opening');
    expect(prompt).toContain('Baptist tradition');
  });
});
