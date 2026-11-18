// packages/api/src/sunday-school/__tests__/fixtures.ts
import type { SaveSundaySchoolProfileData } from '@clawix/shared';

import type {
  SundaySchoolCourseWithLessons,
  SundaySchoolLessonWithCourse,
  SundaySchoolProfileWithCount,
} from '../../db/sunday-school.repository.js';
import type { SundaySchoolLesson } from '../../generated/prisma/client.js';

export const NOW = new Date('2026-11-18T00:00:00Z');

export const leader = { id: 'u1', role: 'ministry_leader' };
export const volunteer = { id: 'u2', role: 'volunteer' };

export const profileData: SaveSundaySchoolProfileData = {
  name: 'Adult class',
  description: 'Reads a book together',
  ageStage: 'mixed_adults',
  literacyLevel: 'conversational',
  spiritualMaturity: 'growing',
  bibleTranslation: 'CUNP',
  tradition: 'baptist',
  guardrails: "Believer's baptism",
  classSize: 15,
  defaultDurationMinutes: 45,
};

export function profileRow(courses = 0): SundaySchoolProfileWithCount {
  return {
    ...profileData,
    id: 'p1',
    createdAt: NOW,
    updatedAt: NOW,
    _count: { courses },
  };
}

export function lessonRow(over: Partial<SundaySchoolLesson> = {}): SundaySchoolLesson {
  return {
    id: 'l1',
    courseId: 'c1',
    weekNumber: 1,
    title: 'Running from God',
    passage: 'Jonah 1',
    bigIdea: 'God pursues',
    learningObjective: 'Name a way we run',
    status: 'outline',
    methodology: 'inductive',
    participationLevel: 3,
    deliveryFormat: 'in_person',
    targetDurationMinutes: 45,
    blocks: [],
    exegesis: null,
    review: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

export function courseRow(
  over: Partial<SundaySchoolCourseWithLessons> = {},
): SundaySchoolCourseWithLessons {
  return {
    id: 'c1',
    title: 'Jonah',
    mode: 'book',
    subject: 'Jonah',
    language: 'en',
    methodology: 'inductive',
    deliveryFormat: 'in_person',
    profileId: 'p1',
    syllabusApproved: false,
    createdById: 'u1',
    createdAt: NOW,
    updatedAt: NOW,
    profile: { name: 'Adult class' },
    lessons: [lessonRow()],
    ...over,
  };
}

export function lessonWithCourse(
  lesson: Partial<SundaySchoolLesson> = {},
  approved = true,
): SundaySchoolLessonWithCourse {
  const {
    lessons: _lessons,
    profile: _profile,
    ...course
  } = courseRow({
    syllabusApproved: approved,
  });
  return { ...lessonRow(lesson), course: { ...course, profile: profileRow(1) } };
}

export const block = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  type: 'hook',
  title: 'Opening',
  durationMinutes: 45,
  content: 'Ask a question',
  teacherNotes: 'Keep it short',
  studentPrompt: '',
  studentAnswerKey: '',
  ...over,
});
