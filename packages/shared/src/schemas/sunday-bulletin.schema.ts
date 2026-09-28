import { z } from 'zod';

import { MAX_ARCHIVE_FILE_BYTES } from './bulletin-archive.schema.js';

// Weekly bulletins edited in the Sunday Service Bulletin AI Tool, shared by
// the whole church team. The tool owns the bulletin shape (its ChurchService
// type); the API only needs the id, title and date and stores the rest as-is.
export const MAX_SUNDAY_BULLETIN_BYTES = 512 * 1024;
export const MAX_SUNDAY_BULLETINS_PER_SAVE = 20;

export const sundayBulletinSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9_-]+$/, 'Invalid bulletin id'),
    title: z.string().max(500),
    date: z.string().max(200),
  })
  .passthrough()
  .refine(
    (b) => new TextEncoder().encode(JSON.stringify(b)).length <= MAX_SUNDAY_BULLETIN_BYTES,
    'Bulletin exceeds 512 KB',
  );

export type SundayBulletinData = z.infer<typeof sundayBulletinSchema>;

export const saveSundayBulletinsSchema = z.object({
  bulletins: z.array(sundayBulletinSchema).min(1).max(MAX_SUNDAY_BULLETINS_PER_SAVE),
});

export type SaveSundayBulletinsInput = z.infer<typeof saveSundayBulletinsSchema>;

export interface SundayBulletinList {
  /** Active (not archived) bulletins, oldest first. */
  readonly bulletins: readonly SundayBulletinData[];
  /** Uploaded PDFs still being read by AI into bulletins. */
  readonly pendingImports: number;
  /** Uploaded PDFs AI could not read (until read on a retry or the API restarts). */
  readonly failedImports: readonly FailedBulletinImport[];
}

export interface FailedBulletinImport {
  readonly fileName: string;
  readonly reason: string;
}

export interface SaveSundayBulletinsResult {
  readonly saved: number;
  /** Ids already archived — archived bulletins are never brought back by a save. */
  readonly skippedArchived: readonly string[];
}

export interface ResetSundayBulletinsResult {
  /** Bulletins archived by the reset (they stay in Postgres). */
  readonly archived: number;
}

export interface ImportSundayBulletinsResult {
  readonly archived: number;
  readonly duplicates: number;
  /** PDFs now being read by AI in the background. */
  readonly importing: number;
}

// A printed duty roster (司職表) PDF, read by AI into roster schedule entries
// named after the bulletin's own roster rows (sent as `examples`).
export const importRosterSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  base64: z
    .string()
    .min(1)
    .max(Math.ceil(MAX_ARCHIVE_FILE_BYTES / 3) * 4)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Invalid base64'),
  /** The Sunday the example names are from (ISO), if the roster covers it. */
  examplesDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  examples: z
    .array(
      z.object({
        section: z.string().max(100),
        role: z.string().max(100),
        example: z.string().max(500).default(''),
      }),
    )
    .max(100)
    .default([]),
});

export type ImportRosterInput = z.infer<typeof importRosterSchema>;
export type RosterExampleRow = ImportRosterInput['examples'][number];

export interface RosterScheduleEntryData {
  /** ISO YYYY-MM-DD */
  readonly date: string;
  readonly section: string;
  readonly role: string;
  /** Several people are separated by newlines, as in the bulletin. */
  readonly name: string;
}

export interface ImportRosterResult {
  readonly entries: readonly RosterScheduleEntryData[];
  /** Special services and anything skipped, for the officer to check. */
  readonly notes: readonly string[];
}
