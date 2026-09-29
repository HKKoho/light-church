import { describe, expect, it } from 'vitest';

import {
  WISDOM_COURSE_ID,
  WISDOM_MEMBER_PATH,
  saveWisdomCourseSchema,
  wisdomCoursePath,
  wisdomPerspectiveSchema,
  wisdomReadingName,
} from '../wisdom.schema.js';

const imageUrl = (url: string) => wisdomPerspectiveSchema.safeParse({ imageUrl: url }).success;

describe('wisdom image links', () => {
  it('accepts full links, site paths and blanks', () => {
    expect(imageUrl('https://example.com/ruth.jpg')).toBe(true);
    expect(imageUrl('/images/wisdom/ruth.jpg')).toBe(true);
    expect(imageUrl('')).toBe(true);
  });

  it('rejects other schemes, bare names and protocol-relative links', () => {
    expect(imageUrl('javascript:alert(1)')).toBe(false);
    expect(imageUrl('images/ruth.jpg')).toBe(false);
    expect(imageUrl('//evil.example/ruth.jpg')).toBe(false);
    expect(imageUrl('/\\evil.example/ruth.jpg')).toBe(false);
  });
});

describe('wisdom courses', () => {
  const fallback = { PROVERBS: 'Proverbs', ECCLESIASTES: 'Ecclesiastes', JOB: 'Job' };

  it('names reading slots from the course, falling back when blank', () => {
    expect(wisdomReadingName(['Law', ' ', 'Gospel'], 'PROVERBS', fallback)).toBe('Law');
    expect(wisdomReadingName(['Law', ' ', 'Gospel'], 'ECCLESIASTES', fallback)).toBe(
      'Ecclesiastes',
    );
    expect(wisdomReadingName([], 'JOB', fallback)).toBe('Job');
  });

  it('keeps Wisdom in Bible at its old address and puts others under /courses', () => {
    expect(wisdomCoursePath(WISDOM_COURSE_ID)).toBe(WISDOM_MEMBER_PATH);
    expect(wisdomCoursePath('abc')).toMatch(/\/courses\/abc$/);
  });

  it('allows at most three reading names', () => {
    const course = (readingLabels: string[]) =>
      saveWisdomCourseSchema.safeParse({ title: 'Galatians', readingLabels }).success;
    expect(course(['a', 'b', 'c'])).toBe(true);
    expect(course(['a', 'b', 'c', 'd'])).toBe(false);
  });
});
