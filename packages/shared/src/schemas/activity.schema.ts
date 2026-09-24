import { z } from 'zod';

// Mission / Camp Companion: one activity (mission trip, camp, retreat, …) is a
// JSON document. Every section is optional so a leader can start from a title
// and fill in what their activity needs.

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).optional().default('');
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .or(z.literal(''))
  .optional()
  .default('');
const assetId = z.string().cuid().nullable().optional().default(null);

export const ACTIVITY_KINDS = ['mission', 'camp', 'retreat', 'other'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

const infoItem = z.object({ label: optionalText(80), text: text(2000) });

export const activityContentSchema = z.object({
  kind: z.enum(ACTIVITY_KINDS).default('mission'),
  theme: optionalText(200),
  location: optionalText(200),
  startDate: isoDate,
  endDate: isoDate,
  summary: optionalText(4000),
  coverAssetId: assetId,
  // "Background" and "important notices" — label + text pairs.
  background: z.array(infoItem).max(50).default([]),
  notices: z.array(infoItem).max(50).default([]),
  schedule: z
    .array(
      z.object({
        date: text(40),
        morning: optionalText(500),
        noon: optionalText(500),
        afternoon: optionalText(500),
        evening: optionalText(500),
      }),
    )
    .max(60)
    .default([]),
  team: z
    .array(z.object({ name: text(100), role: optionalText(100), phone: optionalText(40) }))
    .max(200)
    .default([]),
  contacts: z
    .array(
      z.object({
        name: text(100),
        role: optionalText(100),
        phone: optionalText(40),
        email: optionalText(200),
      }),
    )
    .max(50)
    .default([]),
  packing: z.array(text(200)).max(200).default([]),
  devotionals: z
    .array(
      z.object({
        day: z.number().int().min(1).max(60),
        title: optionalText(200),
        scriptureRef: optionalText(200),
        scriptureText: optionalText(8000),
        guide: optionalText(20000),
        reflections: z.array(text(1000)).max(20).default([]),
        prayer: optionalText(4000),
      }),
    )
    .max(60)
    .default([]),
  songs: z
    .array(
      z.object({
        title: text(200),
        lang: z.enum(['zh', 'en', 'other']).default('zh'),
        category: optionalText(80),
        author: optionalText(200),
        lyrics: optionalText(10000),
        youtubeId: z
          .string()
          .regex(/^[A-Za-z0-9_-]{6,20}$/)
          .or(z.literal(''))
          .optional()
          .default(''),
        audioAssetId: assetId,
      }),
    )
    .max(200)
    .default([]),
  notes: optionalText(20000),
});

export type ActivityContent = z.infer<typeof activityContentSchema>;

export const saveActivitySchema = z.object({
  title: text(200).min(1),
  content: activityContentSchema,
});
export type SaveActivityInput = z.infer<typeof saveActivitySchema>;

/** Roles that create and edit activities; every signed-in user can view them. */
export const ACTIVITY_EDITOR_ROLES: readonly string[] = [
  'super_admin',
  'senior_pastor',
  'pastor',
  'admin_staff',
  'ministry_leader',
];

export type ActivityAssetKind = 'image' | 'document' | 'audio';

export interface ActivityAssetInfo {
  readonly id: string;
  readonly kind: ActivityAssetKind;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly createdAt: string;
}

export interface ActivitySummary {
  readonly id: string;
  readonly title: string;
  readonly kind: ActivityKind;
  readonly location: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly updatedAt: string;
}

export interface ActivityDetail {
  readonly id: string;
  readonly title: string;
  readonly content: ActivityContent;
  readonly assets: readonly ActivityAssetInfo[];
  readonly canEdit: boolean;
  readonly updatedAt: string;
}
