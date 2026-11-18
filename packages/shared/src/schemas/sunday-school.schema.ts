import { z } from 'zod';
import { SITE_EDITOR_ROLES } from './church-site.schema.js';

// Sunday School Studio: helps teachers prepare week-by-week lessons for a
// class. A class profile describes the learners; the Dean drafts a syllabus
// for a book or topic, the teacher edits and approves it, then each lesson is
// prepared in three AI steps — the Exegete (passage context), the Pedagogue
// (timed teaching blocks) and the Reviewer (Scripture, age, doctrine and
// pacing checks). Staff-only; no member data is ever sent to the AI.

/** Create and edit class profiles, courses and lessons. */
export const SUNDAY_SCHOOL_EDITOR_ROLES: readonly string[] = SITE_EDITOR_ROLES;

export const SS_AGE_STAGES = [
  'preschool',
  'elementary',
  'preteen',
  'youth',
  'young_adults',
  'parents',
  'seniors',
  'mixed_adults',
] as const;
export const SS_LITERACY_LEVELS = ['visual', 'basic', 'conversational', 'academic'] as const;
export const SS_MATURITY_LEVELS = ['seeker', 'new_believer', 'growing', 'mature'] as const;
export const SS_TRANSLATIONS = ['CUV', 'CUNP', 'NIV', 'ESV', 'NLT', 'KJV', 'CSB', 'NRSV'] as const;
export const SS_TRADITIONS = [
  'baptist',
  'non_denominational',
  'reformed',
  'wesleyan',
  'pentecostal',
  'anglican',
  'lutheran',
  'catholic',
] as const;
export const SS_METHODOLOGIES = [
  'inductive',
  'storytelling',
  'socratic',
  'lecture_discussion',
  'experiential',
] as const;
export const SS_DELIVERY_FORMATS = ['in_person', 'online'] as const;
export const SS_COURSE_MODES = ['book', 'topical'] as const;
export const SS_LANGUAGES = ['zh-TW', 'en'] as const;
/** outline: from the syllabus · generated: AI prepared it · approved: the teacher signed off. */
export const SS_LESSON_STATUSES = ['outline', 'generated', 'approved'] as const;
/** Hook → Book → Look → Took, as LogosCraft lays a lesson out. */
export const SS_BLOCK_TYPES = [
  'hook',
  'scripture',
  'book',
  'illustration',
  'discussion',
  'activity',
  'application',
] as const;
/** The three AI steps that prepare one lesson, in order. */
export const SS_GENERATION_STAGES = ['exegete', 'pedagogue', 'reviewer'] as const;

export type SsAgeStage = (typeof SS_AGE_STAGES)[number];
export type SsLiteracyLevel = (typeof SS_LITERACY_LEVELS)[number];
export type SsMaturityLevel = (typeof SS_MATURITY_LEVELS)[number];
export type SsTranslation = (typeof SS_TRANSLATIONS)[number];
export type SsTradition = (typeof SS_TRADITIONS)[number];
export type SsMethodology = (typeof SS_METHODOLOGIES)[number];
export type SsDeliveryFormat = (typeof SS_DELIVERY_FORMATS)[number];
export type SsCourseMode = (typeof SS_COURSE_MODES)[number];
export type SsLanguage = (typeof SS_LANGUAGES)[number];
export type SsLessonStatus = (typeof SS_LESSON_STATUSES)[number];
export type SsBlockType = (typeof SS_BLOCK_TYPES)[number];
export type SsGenerationStage = (typeof SS_GENERATION_STAGES)[number];

export const SS_MIN_WEEKS = 2;
export const SS_MAX_WEEKS = 12;
export const SS_MIN_MINUTES = 10;
export const SS_MAX_MINUTES = 180;

const text = (max: number) => z.string().trim().min(1).max(max);
const longText = (max: number) => z.string().trim().max(max).default('');
const minutes = z.coerce.number().int().min(SS_MIN_MINUTES).max(SS_MAX_MINUTES);

// --- Class profiles ---------------------------------------------------------

export const saveSundaySchoolProfileSchema = z.object({
  name: text(120),
  description: longText(1000),
  ageStage: z.enum(SS_AGE_STAGES),
  literacyLevel: z.enum(SS_LITERACY_LEVELS),
  spiritualMaturity: z.enum(SS_MATURITY_LEVELS),
  bibleTranslation: z.enum(SS_TRANSLATIONS),
  tradition: z.enum(SS_TRADITIONS),
  /** Doctrinal notes the AI must respect, e.g. "believer's baptism by immersion". */
  guardrails: longText(2000),
  classSize: z.coerce.number().int().min(1).max(500),
  defaultDurationMinutes: minutes,
});
export type SaveSundaySchoolProfileInput = z.input<typeof saveSundaySchoolProfileSchema>;
export type SaveSundaySchoolProfileData = z.infer<typeof saveSundaySchoolProfileSchema>;

export interface SundaySchoolProfileInfo extends SaveSundaySchoolProfileData {
  id: string;
  /** Courses using this profile; a profile in use cannot be deleted. */
  courseCount: number;
  updatedAt: string;
}

// --- Courses ----------------------------------------------------------------

/** The Dean drafts a syllabus from this; the course is saved unapproved. */
export const generateSundaySchoolSyllabusSchema = z.object({
  title: longText(200),
  mode: z.enum(SS_COURSE_MODES),
  /** A Bible book ("Jonah") or a topic ("Faith and anxiety"). */
  subject: text(200),
  weeks: z.coerce.number().int().min(SS_MIN_WEEKS).max(SS_MAX_WEEKS),
  profileId: text(64),
  methodology: z.enum(SS_METHODOLOGIES),
  deliveryFormat: z.enum(SS_DELIVERY_FORMATS),
  language: z.enum(SS_LANGUAGES),
});
export type GenerateSundaySchoolSyllabusInput = z.input<typeof generateSundaySchoolSyllabusSchema>;
export type GenerateSundaySchoolSyllabusData = z.infer<typeof generateSundaySchoolSyllabusSchema>;

export const updateSundaySchoolCourseSchema = z.object({
  title: text(200),
  /** Approving the syllabus unlocks lesson preparation. */
  syllabusApproved: z.boolean(),
});
export type UpdateSundaySchoolCourseInput = z.infer<typeof updateSundaySchoolCourseSchema>;

/** One week as the Dean drafts it, and as the teacher edits it. */
export const sundaySchoolSyllabusWeekSchema = z.object({
  title: text(200),
  passage: text(200),
  bigIdea: text(1000),
  learningObjective: text(1000),
});
export type SundaySchoolSyllabusWeek = z.infer<typeof sundaySchoolSyllabusWeekSchema>;

export const sundaySchoolSyllabusDraftSchema = z.object({
  courseTitle: text(200),
  weeks: z.array(sundaySchoolSyllabusWeekSchema).min(1).max(SS_MAX_WEEKS),
});
export type SundaySchoolSyllabusDraft = z.infer<typeof sundaySchoolSyllabusDraftSchema>;

export interface SundaySchoolCourseSummary {
  id: string;
  title: string;
  mode: SsCourseMode;
  subject: string;
  language: SsLanguage;
  methodology: SsMethodology;
  deliveryFormat: SsDeliveryFormat;
  profileId: string;
  profileName: string;
  syllabusApproved: boolean;
  lessonCount: number;
  generatedCount: number;
  approvedCount: number;
  updatedAt: string;
}

export interface SundaySchoolLessonSummary {
  id: string;
  weekNumber: number;
  title: string;
  passage: string;
  bigIdea: string;
  learningObjective: string;
  status: SsLessonStatus;
  /** Whether the Reviewer passed it; null before review. */
  reviewPassed: boolean | null;
}

export interface SundaySchoolCourseDetail extends SundaySchoolCourseSummary {
  lessons: SundaySchoolLessonSummary[];
}

// --- Lessons ----------------------------------------------------------------

export const sundaySchoolBlockSchema = z.object({
  id: text(64),
  type: z.enum(SS_BLOCK_TYPES),
  title: text(200),
  durationMinutes: z.coerce.number().int().min(1).max(SS_MAX_MINUTES),
  content: longText(6000),
  teacherNotes: longText(4000),
  /** A learner prompt, with ____ for fill-in-the-blank. */
  studentPrompt: longText(1000),
  studentAnswerKey: longText(1000),
});
export type SundaySchoolBlock = z.infer<typeof sundaySchoolBlockSchema>;

export const sundaySchoolWordNoteSchema = z.object({
  term: text(100),
  language: z.enum(['Hebrew', 'Greek']),
  transliteration: longText(100),
  strongsId: longText(20),
  meaning: text(500),
});
export type SundaySchoolWordNote = z.infer<typeof sundaySchoolWordNoteSchema>;

/**
 * The Exegete's notes. Verses are given as references with a one-line gist,
 * never as quoted text: the teacher reads them from the class's own Bible.
 */
export const sundaySchoolExegesisSchema = z.object({
  historicalContext: text(3000),
  theologicalAnchors: z.array(text(1000)).min(1).max(6),
  keyVerses: z
    .array(z.object({ reference: text(100), gist: text(500) }))
    .max(8)
    .default([]),
  crossReferences: z.array(text(100)).max(8).default([]),
  wordNotes: z.array(sundaySchoolWordNoteSchema).max(5).default([]),
});
export type SundaySchoolExegesis = z.infer<typeof sundaySchoolExegesisSchema>;

const checkSchema = z.object({
  status: z.enum(['verified', 'needs_review']),
  detail: longText(2000),
});
export type SundaySchoolCheck = z.infer<typeof checkSchema>;

export const sundaySchoolReviewSchema = z.object({
  passed: z.boolean(),
  verseAccuracy: checkSchema,
  ageFit: checkSchema,
  doctrine: checkSchema,
  pacing: checkSchema.extend({
    allocatedMinutes: z.number().int(),
    targetMinutes: z.number().int(),
  }),
  summary: longText(3000),
});
export type SundaySchoolReview = z.infer<typeof sundaySchoolReviewSchema>;

export const saveSundaySchoolLessonSchema = sundaySchoolSyllabusWeekSchema.extend({
  methodology: z.enum(SS_METHODOLOGIES),
  /** 1 = teacher-led … 5 = highly interactive. */
  participationLevel: z.coerce.number().int().min(1).max(5),
  deliveryFormat: z.enum(SS_DELIVERY_FORMATS),
  targetDurationMinutes: minutes,
  blocks: z.array(sundaySchoolBlockSchema).max(12),
  status: z.enum(SS_LESSON_STATUSES),
});
export type SaveSundaySchoolLessonInput = z.input<typeof saveSundaySchoolLessonSchema>;
export type SaveSundaySchoolLessonData = z.infer<typeof saveSundaySchoolLessonSchema>;

export interface SundaySchoolLessonDetail extends SaveSundaySchoolLessonData {
  id: string;
  courseId: string;
  courseTitle: string;
  weekNumber: number;
  language: SsLanguage;
  profile: SundaySchoolProfileInfo;
  syllabusApproved: boolean;
  exegesis: SundaySchoolExegesis | null;
  review: SundaySchoolReview | null;
  updatedAt: string;
}

export const generateSundaySchoolLessonSchema = z.object({
  stage: z.enum(SS_GENERATION_STAGES),
});
export type GenerateSundaySchoolLessonInput = z.infer<typeof generateSundaySchoolLessonSchema>;

/** Minutes the blocks add up to. */
export const totalMinutes = (blocks: readonly Pick<SundaySchoolBlock, 'durationMinutes'>[]) =>
  blocks.reduce((sum, b) => sum + b.durationMinutes, 0);

/**
 * Scales block durations so they add up to `target` exactly: each block keeps
 * at least 2 minutes, and the rounding remainder goes to the longest block.
 */
export function normalizePacing<T extends Pick<SundaySchoolBlock, 'durationMinutes'>>(
  blocks: readonly T[],
  target: number,
): T[] {
  if (blocks.length === 0) return [];
  const safe = blocks.map((b) => ({
    ...b,
    durationMinutes: Math.max(2, Math.round(b.durationMinutes) || 5),
  }));
  const sum = totalMinutes(safe);
  if (sum === target) return safe;
  const scaled = safe.map((b) => ({
    ...b,
    durationMinutes: Math.max(2, Math.round((b.durationMinutes * target) / sum)),
  }));
  const diff = target - totalMinutes(scaled);
  if (diff !== 0) {
    let longest = 0;
    scaled.forEach((b, i) => {
      if (b.durationMinutes > (scaled[longest]?.durationMinutes ?? 0)) longest = i;
    });
    const block = scaled[longest];
    if (block) block.durationMinutes = Math.max(2, block.durationMinutes + diff);
  }
  return scaled;
}
