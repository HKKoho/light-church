import { z } from 'zod';

// A tool name doubles as its folder name under the shared `AITools/` directory,
// so it must be a single safe path segment: letters (incl. CJK), digits, spaces,
// `_`, `-`, `.` — never a leading dot, never a separator.
export const aiToolNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u, 'Invalid tool name');

export type AiToolKind = 'html' | 'link';

/** Optional per-language text from tool.json (display name or description). */
export interface AiToolDisplayName {
  readonly en: string | null;
  readonly 'zh-TW': string | null;
}

export interface AiToolSummary {
  /** Folder name under AITools/ — the tool's stable id in URLs and storage. */
  readonly name: string;
  readonly displayName: AiToolDisplayName | null;
  readonly kind: AiToolKind;
  /** Plain description, or the English one when tool.json gives both languages. */
  readonly description: string | null;
  readonly descriptions: AiToolDisplayName | null;
  /** External URL — present only for `link` tools. */
  readonly url: string | null;
  /** Link tool that signs the user in via POST /api/v1/ai-tools/:name/sso. */
  readonly sso: boolean;
}

export interface AiToolDetail extends AiToolSummary {
  /** Tool page HTML — present only for `html` tools. */
  readonly html: string | null;
}

// Per-user localStorage snapshot for an HTML tool, persisted by the dashboard's
// storage bridge (the tool iframe has an opaque origin and no real storage).
export const MAX_AI_TOOL_STORAGE_BYTES = 1024 * 1024; // 1 MB

export const aiToolStorageSchema = z
  .object({
    data: z.record(z.string().max(256), z.string()),
  })
  .refine(
    ({ data }) =>
      new TextEncoder().encode(JSON.stringify(data)).length <= MAX_AI_TOOL_STORAGE_BYTES,
    'Tool storage exceeds 1 MB',
  );

export type AiToolStorageInput = z.infer<typeof aiToolStorageSchema>;
