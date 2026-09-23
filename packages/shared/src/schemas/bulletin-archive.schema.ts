import { z } from 'zod';

// Past-bulletin upload from the Sunday Service Bulletin AI Tool. Mirrors the
// tool's own `/api/analyze-bulletins` request body, forwarded by the dashboard.
export const MAX_ARCHIVE_FILES = 10;
export const MAX_ARCHIVE_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per PDF (decoded)

export const archiveBulletinsSchema = z.object({
  churchName: z.string().trim().min(1).max(100),
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        mimeType: z.literal('application/pdf'),
        // base64 of at most MAX_ARCHIVE_FILE_BYTES (4 chars per 3 bytes)
        base64: z
          .string()
          .min(1)
          .max(Math.ceil(MAX_ARCHIVE_FILE_BYTES / 3) * 4)
          .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Invalid base64'),
      }),
    )
    .min(1)
    .max(MAX_ARCHIVE_FILES),
});

export type ArchiveBulletinsInput = z.infer<typeof archiveBulletinsSchema>;

export interface ArchiveBulletinsResult {
  /** Newly stored bulletins. */
  readonly archived: number;
  /** Already in the archive for this church (same content), skipped. */
  readonly duplicates: number;
}

export interface BulletinArchiveEntry {
  readonly id: string;
  readonly churchName: string;
  readonly fileName: string;
  readonly size: number;
  readonly createdAt: string;
}
