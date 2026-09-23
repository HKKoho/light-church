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

export interface AiToolSummary {
  readonly name: string;
  readonly kind: AiToolKind;
  readonly description: string | null;
  /** External URL — present only for `link` tools. */
  readonly url: string | null;
}

export interface AiToolDetail extends AiToolSummary {
  /** Tool page HTML — present only for `html` tools. */
  readonly html: string | null;
}
