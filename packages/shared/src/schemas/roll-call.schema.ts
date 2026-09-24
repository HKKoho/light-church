import { z } from 'zod';

// Roll Call: groups, members and saved roll calls. Member names are personal
// data — they never leave the server except to a local model (Ollama), and
// only when a super_admin has switched Roll Call's local AI on.

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

export const addRollCallMembersSchema = z.object({
  names: z.array(name).min(1).max(1000),
});
export type AddRollCallMembersInput = z.infer<typeof addRollCallMembersSchema>;

export const updateRollCallMemberSchema = z.object({
  name: name.optional(),
  note: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
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

export const rollCallAiSettingsSchema = z.object({ enabled: z.boolean() });
export type RollCallAiSettingsInput = z.infer<typeof rollCallAiSettingsSchema>;

export interface RollCallGroupSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly memberCount: number;
  readonly lastSessionDate: string | null;
}

export interface RollCallMemberInfo {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly active: boolean;
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

export type RollCallAlertKind = 'missing' | 'declining' | 'returned';

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

export interface RollCallSheetName {
  /** The name as read from the photo. */
  readonly text: string;
  readonly memberId: string | null;
  readonly score: number;
}

export interface RollCallAiStatus {
  /** A super_admin has switched local AI on. */
  readonly enabled: boolean;
  /** The local model answered and has the configured model. */
  readonly available: boolean;
  readonly model: string;
  readonly reason: string | null;
}
