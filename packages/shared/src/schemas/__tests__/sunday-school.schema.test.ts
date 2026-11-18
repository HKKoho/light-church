import { describe, expect, it } from 'vitest';

import {
  generateSundaySchoolSyllabusSchema,
  normalizePacing,
  saveSundaySchoolProfileSchema,
  totalMinutes,
} from '../sunday-school.schema.js';

const blocks = (...mins: number[]) => mins.map((durationMinutes) => ({ durationMinutes }));

describe('normalizePacing', () => {
  it('scales durations to add up to the target exactly', () => {
    const paced = normalizePacing(blocks(10, 10, 20), 45);
    expect(totalMinutes(paced)).toBe(45);
  });

  it('leaves blocks that already fit alone and keeps at least 2 minutes each', () => {
    expect(normalizePacing(blocks(15, 30), 45)).toEqual(blocks(15, 30));
    const paced = normalizePacing(blocks(1, 0, 60), 30);
    expect(paced.every((b) => b.durationMinutes >= 2)).toBe(true);
    expect(totalMinutes(paced)).toBe(30);
  });

  it('returns nothing for no blocks', () => {
    expect(normalizePacing([], 45)).toEqual([]);
  });
});

describe('schemas', () => {
  it('bounds a syllabus to 2–12 weeks', () => {
    const base = {
      mode: 'book',
      subject: 'Jonah',
      profileId: 'p1',
      methodology: 'inductive',
      deliveryFormat: 'in_person',
      language: 'zh-TW',
    };
    expect(generateSundaySchoolSyllabusSchema.safeParse({ ...base, weeks: 4 }).success).toBe(true);
    expect(generateSundaySchoolSyllabusSchema.safeParse({ ...base, weeks: 13 }).success).toBe(
      false,
    );
  });

  it('requires known profile values', () => {
    const profile = {
      name: 'Juniors',
      ageStage: 'elementary',
      literacyLevel: 'basic',
      spiritualMaturity: 'growing',
      bibleTranslation: 'CUV',
      tradition: 'baptist',
      classSize: '12',
      defaultDurationMinutes: '40',
    };
    expect(saveSundaySchoolProfileSchema.parse(profile)).toMatchObject({ classSize: 12 });
    expect(
      saveSundaySchoolProfileSchema.safeParse({ ...profile, bibleTranslation: 'MSG' }).success,
    ).toBe(false);
  });
});
