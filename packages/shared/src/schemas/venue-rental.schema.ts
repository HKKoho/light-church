import { z } from 'zod';

// Rent Church Place: the public venue-rental application form (ported from
// City Gospel Church's 1cm venue form). Anyone can submit one without signing
// in; staff review them in the dashboard. Choice values are stored in Chinese,
// exactly as on the original paper and web forms.

/** Roles that see and review venue-rental applications. */
export const VENUE_RENTAL_REVIEWER_ROLES: readonly string[] = [
  'super_admin',
  'senior_pastor',
  'pastor',
  'admin_staff',
];

export const VENUE_TYPES = ['全場', '禮堂', '草地', '一般房間'] as const;
export const VENUE_ACTIVITY_NATURES = [
  '福音性聚會',
  '課程、研討會、教育性聚會',
  '文娛康樂',
] as const;
export const VENUE_ACTIVITY_MODES = ['公開聚會', '會內聚會', '收費活動'] as const;
export const VENUE_AUDIENCES = ['兒童', '親子', '青少年', '成年', '長者', '其他'] as const;
export const VENUE_ATTENDANCE_RANGES = [
  '20 人或以下',
  '21–50 人',
  '51–100 人',
  '101–200 人',
  '200 人以上',
] as const;
export const VENUE_TITLES = ['先生', '女士'] as const;
export const VENUE_APPLICATION_STATUSES = ['pending', 'approved', 'rejected'] as const;

/** Only a general room can be booked by count; the other venues are booked whole. */
export const VENUE_ROOM_TYPE = '一般房間';
/** The one activity mode that must state its fee. */
export const VENUE_PAID_MODE = '收費活動';
export const MAX_VENUE_SESSIONS = 3;
export const MAX_VENUE_ROOMS = 5;

const text = (max: number) => z.string().trim().min(1).max(max);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');

export const venueSessionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    start: time,
    end: time,
  })
  .refine((s) => s.start < s.end, { message: 'End time must be after start time', path: ['end'] });
export type VenueSession = z.infer<typeof venueSessionSchema>;

export const venueApplicationSchema = z
  .object({
    organization: text(200),
    contactPerson: text(100),
    contactTitle: z.enum(VENUE_TITLES),
    mobile: z.string().regex(/^\d{8,15}$/, 'Digits only, 8–15'),
    email: z.string().trim().email().max(200),
    venueType: z.enum(VENUE_TYPES),
    roomCount: z.number().int().min(1).max(MAX_VENUE_ROOMS).nullable().optional(),
    sessions: z.array(venueSessionSchema).min(1).max(MAX_VENUE_SESSIONS),
    activityNature: z.enum(VENUE_ACTIVITY_NATURES),
    activityMode: z.enum(VENUE_ACTIVITY_MODES),
    activityFee: z.number().min(0).max(100_000).nullable().optional(),
    targetAudience: z
      .array(z.enum(VENUE_AUDIENCES))
      .min(1)
      .refine((a) => new Set(a).size === a.length, 'Duplicate audience'),
    attendanceRange: z.enum(VENUE_ATTENDANCE_RANGES),
    description: text(2000),
    repName: text(100),
    repTitle: z.enum(VENUE_TITLES),
    /** Honeypot: hidden on the form, so only bots fill it in. */
    website: z.string().max(200).optional(),
  })
  .refine((a) => a.activityMode !== VENUE_PAID_MODE || a.activityFee != null, {
    message: 'A paid activity must state its fee',
    path: ['activityFee'],
  })
  .transform((a) => ({
    ...a,
    // Room count and fee only apply to a general room / paid activity.
    roomCount: a.venueType === VENUE_ROOM_TYPE ? (a.roomCount ?? 1) : null,
    activityFee: a.activityMode === VENUE_PAID_MODE ? (a.activityFee ?? null) : null,
  }));
export type VenueApplicationInput = z.input<typeof venueApplicationSchema>;
export type VenueApplicationData = z.output<typeof venueApplicationSchema>;

export const reviewVenueApplicationSchema = z.object({
  status: z.enum(VENUE_APPLICATION_STATUSES),
  adminNotes: z.string().trim().max(2000).optional(),
});
export type ReviewVenueApplicationInput = z.infer<typeof reviewVenueApplicationSchema>;

export type VenueApplicationStatus = (typeof VENUE_APPLICATION_STATUSES)[number];

export interface VenueApplicationInfo extends Omit<
  VenueApplicationData,
  'website' | 'roomCount' | 'activityFee'
> {
  readonly id: string;
  readonly roomCount: number | null;
  readonly activityFee: number | null;
  readonly status: VenueApplicationStatus;
  readonly adminNotes: string | null;
  readonly reviewedByName: string | null;
  readonly reviewedAt: string | null;
  readonly createdAt: string;
}
