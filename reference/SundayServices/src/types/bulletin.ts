export interface ServiceItem {
  id: string;
  type: 'prelude' | 'call' | 'hymn' | 'prayer' | 'sermon' | 'offertory' | 'doxology' | 'benediction' | 'custom';
  label: string;
  detail: string;
  leader?: string;
  hymnNumber?: string;
}

export interface Announcement {
  id: string;
  text: string;
}

// Generic "title + optional credit/reference line + free-form body" block.
// Reused across several bulletin pages (hymn lyrics, call-to-worship, sermon
// scripture, monthly verse, ministry updates, other notices, weekly prayers)
// so each week's officer can add/edit these sections without a bespoke form
// per section type. Body text preserves line breaks (rendered with
// whitespace-pre-line).
export interface TextBlock {
  id: string;
  title: string;
  meta?: string;
  body: string;
}

// Service-roster row, grouped by `section` (e.g. "主日崇拜事奉芳名表" vs
// "觀塘堂主日兒童崇拜事奉芳名表") so several roster tables can share one page.
export interface RosterRow {
  id: string;
  section: string;
  role: string;
  thisWeek: string;
  nextWeek: string;
}

export interface AttendanceRow {
  id: string;
  meeting: string;
  count: string;
}

// One row of an uploaded, multi-week service-people arrangement schedule —
// unlike RosterRow (which only ever holds "this week"/"next week" for one
// bulletin), this spans however many future Sundays the church has already
// planned, keyed by the exact date the assignment is for.
export interface RosterScheduleEntry {
  id: string;
  date: string; // ISO 'YYYY-MM-DD' — the Sunday this assignment applies to
  section: string;
  role: string;
  name: string;
}

// A worship song catalog entry, as used by the hymn-matching AI assistant.
// The built-in HYMN_LIBRARY (data/initialData.ts) seeds this; uploaded songs
// (SidebarLeft's "上載詩歌庫") extend/override it by number.
export interface HymnLibraryEntry {
  number: string;
  title: string;
  tags: string[];
  style: string;
}

// Editorial approval pipeline: officer drafts -> pastor reviews -> deacon
// final cross-check -> finalized (ready to publish/send). A reject at either
// review stage sends the bulletin back to 'draft' for the officer to re-edit.
export type ServiceStatus = 'draft' | 'pastor_review' | 'deacon_review' | 'finalized';

export type EditorialRole = 'officer' | 'pastor' | 'deacon';

export interface ChurchService {
  id: string;
  title: string; // e.g. "Sunday Morning Oct 22, 2023"
  date: string; // e.g. "October 22, 2023"
  churchName: string;
  motto: string;
  sermonTitle: string;
  sermonSeries: string;
  scripture: string;
  preacher: string;
  items: ServiceItem[];
  announcements: Announcement[];
  status: ServiceStatus;

  // Additional bulletin pages, matching the sections of the printed
  // original (26-31-0802主餐崇拜.md). Each starts empty for lightly-drafted
  // weeks and is filled in gradually rather than all at once.
  hymnLyrics: TextBlock[]; // 詩歌全詞
  worshipNotes: TextBlock[]; // 崇拜資料：宣召啟應文／信息經文／金句
  ministryUpdates: TextBlock[]; // 家事分享
  otherNotices: TextBlock[]; // 其他報告
  weeklyPrayers: TextBlock[]; // 本週代禱
  serviceRoster: RosterRow[]; // 事奉芳名表（可分多組）
  attendance: AttendanceRow[]; // 上週聚會出席人數表
  attendanceNote?: string;
}

export interface Volunteer {
  id: string;
  initials: string;
  name: string;
  role: string;
  consecutiveWeeks: number;
  available: boolean;
}

export interface ValidationAlert {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  actionText?: string;
  actionType?: 'shuffle_roster' | 'update_hymn' | 'resolve_conflict' | 'dismiss';
}

export interface ConfigurationRules {
  sermonSeries: string;
  hymnStyle: string;
  conflictCheck: boolean;
  bufferMinutes: number;
}

export interface AutomationToggles {
  hymnSelection: boolean;
  volunteerRotation: boolean;
  conflictCheck: boolean;
  autoFormat: boolean;
}
