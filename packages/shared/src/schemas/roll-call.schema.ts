import { z } from 'zod';

// Roll Call: groups, members and saved roll calls. Member names and details
// are personal data — they never leave the server. Only Chinese names may go
// to a local model (Ollama) for romanisation, and only when a super_admin has
// switched Roll Call's local AI on.

/** Roles that take attendance. */
export const ROLL_CALL_ROLES: readonly string[] = [
  'super_admin',
  'senior_pastor',
  'pastor',
  'admin_staff',
  'ministry_leader',
  'volunteer',
];

/** Roles that manage groups and members and see pastoral-care insights. */
export const ROLL_CALL_MANAGER_ROLES: readonly string[] = [
  'super_admin',
  'senior_pastor',
  'pastor',
  'admin_staff',
  'ministry_leader',
];

const name = z.string().trim().min(1).max(100);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const saveRollCallGroupSchema = z.object({
  name,
  description: z.string().trim().max(500).optional().default(''),
});
export type SaveRollCallGroupInput = z.infer<typeof saveRollCallGroupSchema>;

export const ROLL_CALL_SEXES = ['male', 'female', ''] as const;
export type RollCallSex = (typeof ROLL_CALL_SEXES)[number];

const sex = z.enum(ROLL_CALL_SEXES);
const birthYear = z.number().int().min(1900).max(new Date().getFullYear()).nullable();

export const rollCallMemberInputSchema = z.object({
  name,
  sex: sex.optional(),
  birthYear: birthYear.optional(),
});
export type RollCallMemberInput = z.infer<typeof rollCallMemberInputSchema>;

export const addRollCallMembersSchema = z.object({
  members: z.array(rollCallMemberInputSchema).min(1).max(1000),
});
export type AddRollCallMembersInput = z.infer<typeof addRollCallMembersSchema>;

export const updateRollCallMemberSchema = z.object({
  name: name.optional(),
  note: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
  sex: sex.optional(),
  birthYear: birthYear.optional(),
});
export type UpdateRollCallMemberInput = z.infer<typeof updateRollCallMemberSchema>;

export const mergeRollCallMembersSchema = z.object({
  keepId: z.string().min(1),
  mergeId: z.string().min(1),
});
export type MergeRollCallMembersInput = z.infer<typeof mergeRollCallMembersSchema>;

export const createRollCallSessionSchema = z.object({
  date: isoDate,
  label: z.string().trim().max(100).optional().default(''),
});
export type CreateRollCallSessionInput = z.infer<typeof createRollCallSessionSchema>;

export const saveRollCallSessionSchema = z.object({
  date: isoDate,
  label: z.string().trim().max(100),
  guestCount: z.number().int().min(0).max(100_000),
  /** Ids of the members present; everyone else in the group was absent. */
  presentIds: z.array(z.string().min(1)).max(5000),
});
export type SaveRollCallSessionInput = z.infer<typeof saveRollCallSessionSchema>;

/** Records that someone reached out to a member (clears their absence reminder). */
export const rollCallFollowUpSchema = z.object({
  note: z.string().trim().max(500).optional().default(''),
});
export type RollCallFollowUpInput = z.infer<typeof rollCallFollowUpSchema>;

/**
 * Simple mode (茶果嶺浸信會點名應用程式): one quick list per user, like the
 * original Roll Call app — names, who is present (with the time ticked), the
 * imported list's file name.
 */
export const simpleRollCallSchema = z.object({
  fileName: z.string().trim().max(200).default(''),
  members: z
    .array(z.object({ id: z.string().min(1).max(64), name }))
    .max(2000)
    .default([]),
  /** memberId → ISO time they were ticked present. */
  present: z.record(z.string().max(64), z.string().max(40)).default({}),
});
export type SimpleRollCall = z.infer<typeof simpleRollCallSchema>;

export const rollCallAiSettingsSchema = z.object({ enabled: z.boolean() });
export type RollCallAiSettingsInput = z.infer<typeof rollCallAiSettingsSchema>;

export interface RollCallGroupSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly memberCount: number;
  readonly lastSessionDate: string | null;
  /** People with an open absence reminder (0 for those who can't see care insights). */
  readonly followUpCount: number;
}

export interface RollCallMemberInfo {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly active: boolean;
  readonly sex: RollCallSex;
  readonly birthYear: number | null;
  readonly followedUpAt: string | null;
  readonly followUpNote: string;
}

export interface RollCallGroupDetail extends RollCallGroupSummary {
  readonly members: readonly RollCallMemberInfo[];
  readonly canManage: boolean;
}

export interface RollCallSessionSummary {
  readonly id: string;
  readonly date: string;
  readonly label: string;
  readonly guestCount: number;
  readonly presentCount: number;
}

export interface RollCallSessionDetail extends RollCallSessionSummary {
  readonly presentIds: readonly string[];
}

/**
 * absent — a regular who missed the last one or two roll calls (a gentle check-in);
 * missing — a regular who missed three or more in a row;
 * declining — coming noticeably less often; returned — back after a gap.
 */
export type RollCallAlertKind = 'absent' | 'missing' | 'declining' | 'returned';

export interface RollCallAlert {
  readonly memberId: string;
  readonly name: string;
  readonly kind: RollCallAlertKind;
  /** Sessions missed in a row (missing), or before coming back (returned). */
  readonly streak: number;
  /** Attendance rate (0–1) before the recent change. */
  readonly previousRate: number;
  /** Attendance rate (0–1) over the recent sessions. */
  readonly recentRate: number;
  readonly lastPresent: string | null;
  /** A follow-up was recorded since this absence began — shown as handled. */
  readonly followedUp: boolean;
  readonly followedUpAt: string | null;
  readonly followUpNote: string;
}

export interface RollCallTrendPoint {
  readonly date: string;
  readonly present: number;
  readonly guests: number;
  readonly members: number;
}

export interface RollCallForecast {
  /** Expected members present next time, and a likely range. */
  readonly expected: number;
  readonly low: number;
  readonly high: number;
  readonly expectedGuests: number;
  readonly direction: 'rising' | 'steady' | 'falling';
  /** Sessions the forecast is based on. */
  readonly basedOn: number;
}

export interface RollCallInsights {
  readonly alerts: readonly RollCallAlert[];
  readonly neverAttended: readonly { id: string; name: string }[];
  readonly trend: readonly RollCallTrendPoint[];
  readonly forecast: RollCallForecast | null;
}

export interface RollCallDuplicate {
  readonly a: RollCallMemberInfo;
  readonly b: RollCallMemberInfo;
  readonly score: number;
  readonly source: 'local' | 'ai';
  readonly reason: string;
}

export interface RollCallAiStatus {
  /** A super_admin has switched local AI on. */
  readonly enabled: boolean;
  /** The local model answered and has the configured model. */
  readonly available: boolean;
  readonly model: string;
  readonly reason: string | null;
}

/** Attendance pattern over a member's record. */
export type RollCallSegment = 'regular' | 'occasional' | 'rare' | 'lapsed' | 'new' | 'never';

export interface RollCallMemberStats {
  readonly id: string;
  readonly name: string;
  readonly sex: RollCallSex;
  readonly age: number | null;
  readonly attended: number;
  /** Roll calls since the member first attended. */
  readonly possible: number;
  /** attended / possible (0–1); null before the first attendance. */
  readonly rate: number | null;
  /** Recent six roll calls minus the earlier record, in rate points (−1…1). */
  readonly change: number | null;
  /** Current run: positive = present in a row, negative = absent in a row. */
  readonly streak: number;
  readonly lastPresent: string | null;
  readonly segment: RollCallSegment;
}

export interface RollCallMonth {
  readonly month: string; // YYYY-MM
  readonly sessions: number;
  readonly avgPresent: number;
  readonly avgGuests: number;
  readonly avgRate: number;
  /** Change in average present vs the previous month, or null for the first. */
  readonly change: number | null;
}

export interface RollCallBreakdownRow {
  readonly key: string;
  readonly members: number;
  /** Average attendance rate of those members who have attended (0–1). */
  readonly avgRate: number | null;
}

export interface RollCallAnalysis {
  readonly sessions: number;
  readonly members: readonly RollCallMemberStats[];
  readonly months: readonly RollCallMonth[];
  readonly bySex: readonly RollCallBreakdownRow[];
  readonly byAge: readonly RollCallBreakdownRow[];
  readonly segments: Readonly<Record<RollCallSegment, number>>;
}
