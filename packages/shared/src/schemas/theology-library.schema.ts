import { z } from 'zod';
import { SS_TRADITIONS } from './sunday-school.schema.js';

// Theology Library (docs/RAGplan.md Option A) and the Theology Platform built
// on it. Pastors upload readings (PDF, DOCX, Markdown, text); the system
// extracts, chunks and embeds them; a pastor reviews each source and sets its
// doctrine tags. Only approved sources are ever searched or cited.

/** Upload, review, reprocess and delete sources. */
export const THEOLOGY_CURATOR_ROLES: readonly string[] = ['super_admin', 'senior_pastor', 'pastor'];

/** Search the approved library and ask the Theology Assistant. */
export const THEOLOGY_READER_ROLES: readonly string[] = [
  ...THEOLOGY_CURATOR_ROLES,
  'admin_staff',
  'finadmin',
  'deacon',
  'ministry_leader',
];

export const THEOLOGY_SOURCE_KINDS = [
  'book',
  'commentary',
  'systematic',
  'creed',
  'confession',
  'sermon',
  'article',
  'lecture',
  'other',
] as const;
export type TheologySourceKind = (typeof THEOLOGY_SOURCE_KINDS)[number];

export const THEOLOGY_SOURCE_STATUSES = [
  'processing',
  'pending_review',
  'approved',
  'rejected',
  'failed',
] as const;
export type TheologySourceStatus = (typeof THEOLOGY_SOURCE_STATUSES)[number];

export const THEOLOGY_LANGUAGES = ['zh-TW', 'zh-CN', 'en', 'other'] as const;
export type TheologyLanguage = (typeof THEOLOGY_LANGUAGES)[number];

/** Doctrine tags share the Sunday School tradition vocabulary. [] = general. */
export const THEOLOGY_DOCTRINE_TAGS = SS_TRADITIONS;
export type TheologyDoctrineTag = (typeof THEOLOGY_DOCTRINE_TAGS)[number];

/** Assistant focus — the three tabs ported from AITheologyPlatform. */
export const THEOLOGY_ASK_MODES = ['general', 'church_history', 'systematic'] as const;
export type TheologyAskMode = (typeof THEOLOGY_ASK_MODES)[number];

export const THEOLOGY_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain',
] as const;
export type TheologyUploadMimeType = (typeof THEOLOGY_UPLOAD_MIME_TYPES)[number];

export const MAX_THEOLOGY_FILE_BYTES = 20 * 1024 * 1024; // decoded
export const MAX_THEOLOGY_TOP_K = 10;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const uploadReadingSourceSchema = z.object({
  title: z.string().trim().min(1).max(300),
  author: optionalText(200),
  kind: z.enum(THEOLOGY_SOURCE_KINDS),
  language: z.enum(THEOLOGY_LANGUAGES),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(THEOLOGY_UPLOAD_MIME_TYPES),
  base64: z
    .string()
    .min(1)
    .max(Math.ceil(MAX_THEOLOGY_FILE_BYTES / 3) * 4)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Invalid base64'),
  /** The uploader attests the church may use this text (see RAGplan §governance). */
  copyrightConfirmed: z.literal(true),
  copyrightNote: optionalText(500),
});
export type UploadReadingSourceInput = z.input<typeof uploadReadingSourceSchema>;
export type UploadReadingSourceData = z.output<typeof uploadReadingSourceSchema>;

export const reviewReadingSourceSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    doctrineTags: z.array(z.enum(THEOLOGY_DOCTRINE_TAGS)).max(THEOLOGY_DOCTRINE_TAGS.length),
    reviewNote: optionalText(1000),
  })
  .refine((v) => v.status !== 'rejected' || !!v.reviewNote, {
    message: 'A note is required when rejecting a source',
    path: ['reviewNote'],
  });
export type ReviewReadingSourceInput = z.input<typeof reviewReadingSourceSchema>;
export type ReviewReadingSourceData = z.output<typeof reviewReadingSourceSchema>;

export const theologySearchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  topK: z.number().int().min(1).max(MAX_THEOLOGY_TOP_K).default(6),
  kinds: z.array(z.enum(THEOLOGY_SOURCE_KINDS)).max(THEOLOGY_SOURCE_KINDS.length).optional(),
  /** Traditions to include besides general (untagged) sources; omitted = all. */
  doctrineTags: z
    .array(z.enum(THEOLOGY_DOCTRINE_TAGS))
    .max(THEOLOGY_DOCTRINE_TAGS.length)
    .optional(),
});
export type TheologySearchInput = z.input<typeof theologySearchSchema>;
export type TheologySearchData = z.output<typeof theologySearchSchema>;

export const theologyAskSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  mode: z.enum(THEOLOGY_ASK_MODES).default('general'),
  language: z.enum(['en', 'zh-TW']).default('zh-TW'),
  doctrineTags: z
    .array(z.enum(THEOLOGY_DOCTRINE_TAGS))
    .max(THEOLOGY_DOCTRINE_TAGS.length)
    .optional(),
  /** Earlier turns of this conversation, oldest first. */
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(8000),
      }),
    )
    .max(12)
    .default([]),
});
export type TheologyAskInput = z.input<typeof theologyAskSchema>;
export type TheologyAskData = z.output<typeof theologyAskSchema>;

export interface ReadingSourceSummary {
  readonly id: string;
  readonly title: string;
  readonly author: string | null;
  readonly kind: TheologySourceKind;
  readonly language: TheologyLanguage;
  readonly fileName: string;
  readonly fileSizeBytes: number;
  readonly pageCount: number | null;
  readonly ocrPagesUsed: number;
  readonly status: TheologySourceStatus;
  readonly statusDetail: string | null;
  readonly doctrineTags: readonly TheologyDoctrineTag[];
  readonly chunkCount: number;
  readonly reviewNote: string | null;
  readonly reviewedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReadingSourceDetail extends ReadingSourceSummary {
  readonly copyrightNote: string | null;
  /** Extracted Markdown, for the reviewer to read. */
  readonly content: string;
}

export interface TheologyPassage {
  readonly chunkId: string;
  readonly sourceId: string;
  readonly sourceTitle: string;
  readonly author: string | null;
  readonly kind: TheologySourceKind;
  readonly page: number | null;
  readonly heading: string;
  readonly text: string;
  readonly scriptureRefs: readonly string[];
  /** Fused rank score, higher is better; only comparable within one search. */
  readonly score: number;
}

export interface TheologyAnswer {
  /** Markdown; claims cite passages as [1], [2] … in `citations` order. */
  readonly answer: string;
  readonly citations: readonly TheologyPassage[];
  /** False when no approved passage was relevant enough to ground an answer. */
  readonly grounded: boolean;
}
