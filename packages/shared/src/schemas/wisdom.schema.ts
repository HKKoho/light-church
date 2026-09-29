import { z } from 'zod';
import { CHURCH_SITE_BASE, SITE_EDITOR_ROLES } from './church-site.schema.js';

// Wisdom in Bible: a course of cycles and modules. Each module asks life
// questions, sets three Scripture perspectives side by side (Proverbs: how
// life should be ordered; Ecclesiastes: how it often is; Job: how it
// sometimes collapses), then guides the tension, discussion and a summary.
// Staff edit it in the dashboard; signed-in members take it at
// /churchweb/ai-tools/wisdom-in-bible.
//
// Sunday School courses reuse the same structure: each is a WisdomCourse with
// its own cycles and lessons, and names the three reading slots itself. The
// slot keys stay PROVERBS / ECCLESIASTES / JOB for every course.

/** Where members take the course on the church website. */
export const WISDOM_MEMBER_PATH = `${CHURCH_SITE_BASE}/ai-tools/wisdom-in-bible`;

/** The original course; its reading slots use the Proverbs / Ecclesiastes / Job names. */
export const WISDOM_COURSE_ID = 'wisdom-in-bible';

/** Where members take a course on the church website. */
export const wisdomCoursePath = (courseId: string): string =>
  courseId === WISDOM_COURSE_ID ? WISDOM_MEMBER_PATH : `${CHURCH_SITE_BASE}/courses/${courseId}`;

/** Edit cycles and modules, and see answer counts. */
export const WISDOM_EDITOR_ROLES: readonly string[] = SITE_EDITOR_ROLES;

export const WISDOM_PERSPECTIVES = ['PROVERBS', 'ECCLESIASTES', 'JOB'] as const;
export type WisdomPerspectiveType = (typeof WISDOM_PERSPECTIVES)[number];

export const WISDOM_MODULE_STATUSES = ['draft', 'published', 'archived'] as const;
export type WisdomModuleStatus = (typeof WISDOM_MODULE_STATUSES)[number];

export const WISDOM_QUESTION_TYPES = ['open', 'multi_choice'] as const;
export type WisdomQuestionType = (typeof WISDOM_QUESTION_TYPES)[number];

/** Answer keys besides life-question ids: discussion prompts `d0`, `d1`, … and the summary. */
export const WISDOM_SUMMARY_KEY = 'summary';
export const wisdomDiscussionKey = (index: number): string => `d${index}`;

const text = (max: number) => z.string().trim().min(1).max(max);
const longText = (max: number) => z.string().max(max).default('');
const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  // A full link, or a path on this site such as /images/wisdom/ruth.jpg (packages/web/public).
  .refine(
    (u) => u === '' || /^https?:\/\//i.test(u) || /^\/(?![/\\])/.test(u),
    'Use an http(s) link or a /path on this site',
  )
  .default('');

export const wisdomLifeQuestionSchema = z.object({
  /** Kept across edits so members' answers stay attached; new questions omit it. */
  id: z.string().trim().max(64).optional(),
  text: text(2000),
  type: z.enum(WISDOM_QUESTION_TYPES).default('open'),
  options: z.array(text(200)).max(10).default([]),
  mediaUrl: optionalUrl,
  imageUrl: optionalUrl,
  imageAlt: z.string().trim().max(300).default(''),
});
export type WisdomLifeQuestionInput = z.input<typeof wisdomLifeQuestionSchema>;
export type WisdomLifeQuestion = Required<z.infer<typeof wisdomLifeQuestionSchema>>;

export const wisdomPerspectiveSchema = z.object({
  book: z.string().trim().max(200).default(''),
  theme: z.string().trim().max(500).default(''),
  description: longText(20_000),
  imageUrl: optionalUrl,
  imageAlt: z.string().trim().max(300).default(''),
  audioUrl: optionalUrl,
});
export type WisdomPerspective = z.infer<typeof wisdomPerspectiveSchema>;

/** A course's name for a reading slot, or `fallback` (the Wisdom in Bible name) when it has none. */
export function wisdomReadingName(
  labels: readonly string[],
  type: WisdomPerspectiveType,
  fallback: Readonly<Record<WisdomPerspectiveType, string>>,
): string {
  const label = labels[WISDOM_PERSPECTIVES.indexOf(type)]?.trim();
  // Blank names fall back too, so `??` would not do.
  if (label) return label;
  return fallback[type];
}

export const saveWisdomCourseSchema = z.object({
  title: text(200),
  description: z.string().trim().max(2000).default(''),
  /** Names for the three reading slots, in order; blank ones fall back to the Wisdom in Bible names. */
  readingLabels: z.array(z.string().trim().max(200)).max(WISDOM_PERSPECTIVES.length).default([]),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});
export type SaveWisdomCourseInput = z.infer<typeof saveWisdomCourseSchema>;

/** Show or hide a course on the church website. */
export const publishWisdomCourseSchema = z.object({ published: z.boolean() });
export type PublishWisdomCourseInput = z.infer<typeof publishWisdomCourseSchema>;

export const saveWisdomCycleSchema = z.object({
  courseId: text(64),
  title: text(200),
  description: z.string().trim().max(2000).default(''),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});
export type SaveWisdomCycleInput = z.infer<typeof saveWisdomCycleSchema>;

export const saveWisdomModuleSchema = z.object({
  cycleId: text(64),
  title: text(200),
  subtitle: z.string().trim().max(500).default(''),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  status: z.enum(WISDOM_MODULE_STATUSES).default('draft'),
  lifeQuestions: z.array(wisdomLifeQuestionSchema).max(20).default([]),
  perspectives: z.object({
    PROVERBS: wisdomPerspectiveSchema,
    ECCLESIASTES: wisdomPerspectiveSchema,
    JOB: wisdomPerspectiveSchema,
  }),
  tensionGuide: longText(20_000),
  tensionGuideAudioUrl: optionalUrl,
  discussionPrompts: z.array(text(5000)).max(20).default([]),
  summary: longText(20_000),
});
export type SaveWisdomModuleInput = z.input<typeof saveWisdomModuleSchema>;
export type SaveWisdomModuleData = z.infer<typeof saveWisdomModuleSchema>;

/** A member's answers, keyed by life-question id, `d<n>` or `summary`. */
export const saveWisdomAnswersSchema = z.object({
  answers: z
    .record(z.string().max(64), z.string().max(10_000))
    .refine((a) => Object.keys(a).length <= 60, 'Too many answers'),
  completed: z.boolean().default(false),
});
export type SaveWisdomAnswersInput = z.input<typeof saveWisdomAnswersSchema>;

export interface WisdomCourseInfo extends SaveWisdomCourseInput {
  readonly id: string;
  readonly published: boolean;
}

/** Staff view of a course: how much it holds. */
export interface WisdomAdminCourse extends WisdomCourseInfo {
  readonly cycles: number;
  readonly modules: number;
  readonly publishedModules: number;
}

export interface WisdomCycleInfo extends SaveWisdomCycleInput {
  readonly id: string;
}

export interface WisdomModuleSummary {
  readonly id: string;
  readonly cycleId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly sortOrder: number;
  readonly status: WisdomModuleStatus;
  readonly updatedAt: string;
}

export interface WisdomModuleDetail extends WisdomModuleSummary {
  readonly courseId: string;
  /** The course's names for the reading slots (may be blank; see `saveWisdomCourseSchema`). */
  readonly readingLabels: string[];
  readonly lifeQuestions: WisdomLifeQuestion[];
  readonly perspectives: Record<WisdomPerspectiveType, WisdomPerspective>;
  readonly tensionGuide: string;
  readonly tensionGuideAudioUrl: string;
  readonly discussionPrompts: string[];
  readonly summary: string;
}

/** Staff view: every cycle with its modules and how many members answered. */
export interface WisdomAdminCycle extends WisdomCycleInfo {
  readonly modules: (WisdomModuleSummary & { responses: number; completed: number })[];
}

/** Member view: published modules per cycle, with the member's progress. */
export interface WisdomMemberCycle extends WisdomCycleInfo {
  readonly modules: (WisdomModuleSummary & { started: boolean; completed: boolean })[];
}

/** Member view of one published course. */
export interface WisdomMemberCourse {
  readonly course: WisdomCourseInfo;
  readonly cycles: WisdomMemberCycle[];
}

export interface WisdomMemberModule {
  readonly module: WisdomModuleDetail;
  readonly answers: Record<string, string>;
  readonly completed: boolean;
}

/** What other members answered, anonymously: choice counts or recent open answers. */
export interface WisdomQuestionInsight {
  readonly questionId: string;
  readonly respondents: number;
  readonly counts: Record<string, number>;
  readonly samples: string[];
}
