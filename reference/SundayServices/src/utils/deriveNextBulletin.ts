// New bulletins should never start from a blank/hardcoded template — the
// officer's real starting point is always last week's finalized bulletin,
// carried forward one week and ready for edit. See pastbulletins/ for the
// underlying source documents this data model was built from.

import { ChurchService, TextBlock, RosterRow, AttendanceRow, Announcement, ServiceItem, RosterScheduleEntry } from '../types/bulletin';
import { advanceChineseDate, parseChineseDate } from './chineseDate';
import { getComingSunday, getNextSunday } from './sundayDates';
import { applyRosterScheduleToService } from './rosterSchedule';

/** Picks the most recent bulletin out of `services`, by the date encoded in its `date` field. */
export function findLastBulletin(services: ChurchService[]): ChurchService {
  return services.reduce((latest, candidate) => {
    const latestDate = parseChineseDate(latest.date);
    const candidateDate = parseChineseDate(candidate.date);
    if (!latestDate) return candidate;
    if (!candidateDate) return latest;
    return candidateDate > latestDate ? candidate : latest;
  }, services[0]);
}

// Module-local counter so IDs stay unique even when several bulletins are
// derived within the same millisecond (e.g. deriveNextBulletin called
// back-to-back in ensureBulletinForSunday's catch-up loop below) — Date.now()
// alone can repeat across such calls.
let uidCounter = 0;
function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}${Date.now().toString(36)}-${uidCounter.toString(36)}`;
}

function cloneWithFreshIds<T extends { id: string }>(items: T[], prefix: string): T[] {
  return items.map((item) => ({ ...item, id: nextUid(prefix) }));
}

/**
 * Builds a new draft bulletin one week after `source`, carrying its content
 * forward (roster's "next week" becomes "this week", attendance counts
 * reset) so the officer edits an already-populated bulletin instead of
 * starting from scratch.
 */
export function deriveNextBulletin(source: ChurchService): ChurchService {
  const newId = nextUid('service-');

  const serviceRoster: RosterRow[] = cloneWithFreshIds(source.serviceRoster, 'r').map((row) => ({
    ...row,
    thisWeek: row.nextWeek && row.nextWeek !== '--' ? row.nextWeek : row.thisWeek,
    nextWeek: '--',
  }));

  const attendance: AttendanceRow[] = cloneWithFreshIds(source.attendance, 'at').map((row) => ({
    ...row,
    count: '--',
  }));

  return {
    ...source,
    id: newId,
    title: advanceChineseDate(source.title, 7),
    date: advanceChineseDate(source.date, 7),
    status: 'draft',
    items: cloneWithFreshIds<ServiceItem>(source.items, 'i'),
    announcements: cloneWithFreshIds<Announcement>(source.announcements, 'a'),
    hymnLyrics: cloneWithFreshIds<TextBlock>(source.hymnLyrics, 'hl'),
    worshipNotes: cloneWithFreshIds<TextBlock>(source.worshipNotes, 'wn'),
    ministryUpdates: cloneWithFreshIds<TextBlock>(source.ministryUpdates, 'mu'),
    otherNotices: cloneWithFreshIds<TextBlock>(source.otherNotices, 'on'),
    weeklyPrayers: cloneWithFreshIds<TextBlock>(source.weeklyPrayers, 'wp'),
    serviceRoster,
    attendance,
    attendanceNote: undefined,
  };
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Safety cap against a runaway loop if `services` somehow has no parseable
// date at all — ~10 years of weekly bulletins, far more than this could ever
// legitimately need to catch up.
const MAX_CATCH_UP_WEEKS = 520;

/**
 * Ensures a bulletin exists for `targetSunday`, deriving it — and any
 * in-between missing weeks — forward from the most recent bulletin in
 * `services`, so a coming/next Sunday always has a draft ready to open
 * instead of sitting empty until an officer remembers to click "+".
 */
export function ensureBulletinForSunday(
  services: ChurchService[],
  targetSunday: Date,
  rosterSchedule: RosterScheduleEntry[] = []
): ChurchService[] {
  const alreadyExists = services.some((s) => {
    const d = parseChineseDate(s.date);
    return d && isSameCalendarDay(d, targetSunday);
  });
  if (alreadyExists) return services;

  let draft = findLastBulletin(services);
  let draftDate = parseChineseDate(draft.date);
  if (!draftDate) return services;

  const additions: ChurchService[] = [];
  let weeks = 0;
  while (draftDate < targetSunday && weeks < MAX_CATCH_UP_WEEKS) {
    draft = applyRosterScheduleToService(deriveNextBulletin(draft), rosterSchedule);
    draftDate = parseChineseDate(draft.date)!;
    additions.push(draft);
    weeks += 1;
  }

  return additions.length > 0 ? [...services, ...additions] : services;
}

/** Ensures both the coming and next Sunday's bulletins exist, derived forward as needed. */
export function ensureUpcomingBulletins(
  services: ChurchService[],
  today: Date = new Date(),
  rosterSchedule: RosterScheduleEntry[] = []
): ChurchService[] {
  const withComing = ensureBulletinForSunday(services, getComingSunday(today), rosterSchedule);
  return ensureBulletinForSunday(withComing, getNextSunday(today), rosterSchedule);
}
