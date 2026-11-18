// packages/api/src/sunday-school/sunday-school.mappers.ts
import {
  sundaySchoolBlockSchema,
  sundaySchoolExegesisSchema,
  sundaySchoolReviewSchema,
  type SaveSundaySchoolProfileData,
  type SsCourseMode,
  type SsDeliveryFormat,
  type SsLanguage,
  type SsLessonStatus,
  type SsMethodology,
  type SundaySchoolBlock,
  type SundaySchoolCourseDetail,
  type SundaySchoolCourseSummary,
  type SundaySchoolExegesis,
  type SundaySchoolLessonDetail,
  type SundaySchoolLessonSummary,
  type SundaySchoolProfileInfo,
  type SundaySchoolReview,
} from '@clawix/shared';

import type {
  SundaySchoolCourseWithLessons,
  SundaySchoolLessonWithCourse,
  SundaySchoolProfileWithCount,
} from '../db/sunday-school.repository.js';
import type { SundaySchoolLesson, SundaySchoolProfile } from '../generated/prisma/client.js';

// Rows hold the SS_* keys the API wrote after Zod validation.
export function toProfileData(row: SundaySchoolProfile): SaveSundaySchoolProfileData {
  return {
    name: row.name,
    description: row.description,
    ageStage: row.ageStage as SaveSundaySchoolProfileData['ageStage'],
    literacyLevel: row.literacyLevel as SaveSundaySchoolProfileData['literacyLevel'],
    spiritualMaturity: row.spiritualMaturity as SaveSundaySchoolProfileData['spiritualMaturity'],
    bibleTranslation: row.bibleTranslation as SaveSundaySchoolProfileData['bibleTranslation'],
    tradition: row.tradition as SaveSundaySchoolProfileData['tradition'],
    guardrails: row.guardrails,
    classSize: row.classSize,
    defaultDurationMinutes: row.defaultDurationMinutes,
  };
}

export function toProfileInfo(row: SundaySchoolProfileWithCount): SundaySchoolProfileInfo {
  return {
    ...toProfileData(row),
    id: row.id,
    courseCount: row._count.courses,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Stored blocks, skipping any that no longer validate. */
export function readBlocks(value: unknown): SundaySchoolBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((b) => {
    const parsed = sundaySchoolBlockSchema.safeParse(b);
    return parsed.success ? [parsed.data] : [];
  });
}

export function readExegesis(value: unknown): SundaySchoolExegesis | null {
  const parsed = sundaySchoolExegesisSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function readReview(value: unknown): SundaySchoolReview | null {
  const parsed = sundaySchoolReviewSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function toLessonSummary(row: SundaySchoolLesson): SundaySchoolLessonSummary {
  return {
    id: row.id,
    weekNumber: row.weekNumber,
    title: row.title,
    passage: row.passage,
    bigIdea: row.bigIdea,
    learningObjective: row.learningObjective,
    status: row.status as SsLessonStatus,
    reviewPassed: readReview(row.review)?.passed ?? null,
  };
}

export function toCourseSummary(row: SundaySchoolCourseWithLessons): SundaySchoolCourseSummary {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode as SsCourseMode,
    subject: row.subject,
    language: row.language as SsLanguage,
    methodology: row.methodology as SsMethodology,
    deliveryFormat: row.deliveryFormat as SsDeliveryFormat,
    profileId: row.profileId,
    profileName: row.profile.name,
    syllabusApproved: row.syllabusApproved,
    lessonCount: row.lessons.length,
    generatedCount: row.lessons.filter((l) => l.status !== 'outline').length,
    approvedCount: row.lessons.filter((l) => l.status === 'approved').length,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCourseDetail(row: SundaySchoolCourseWithLessons): SundaySchoolCourseDetail {
  return { ...toCourseSummary(row), lessons: row.lessons.map(toLessonSummary) };
}

export function toLessonDetail(row: SundaySchoolLessonWithCourse): SundaySchoolLessonDetail {
  return {
    id: row.id,
    courseId: row.courseId,
    courseTitle: row.course.title,
    weekNumber: row.weekNumber,
    language: row.course.language as SsLanguage,
    profile: toProfileInfo(row.course.profile),
    syllabusApproved: row.course.syllabusApproved,
    title: row.title,
    passage: row.passage,
    bigIdea: row.bigIdea,
    learningObjective: row.learningObjective,
    status: row.status as SsLessonStatus,
    methodology: row.methodology as SsMethodology,
    participationLevel: row.participationLevel,
    deliveryFormat: row.deliveryFormat as SsDeliveryFormat,
    targetDurationMinutes: row.targetDurationMinutes,
    blocks: readBlocks(row.blocks),
    exegesis: readExegesis(row.exegesis),
    review: readReview(row.review),
    updatedAt: row.updatedAt.toISOString(),
  };
}
