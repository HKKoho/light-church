// Applies an uploaded multi-week roster schedule (parseRosterSchedule.ts) to
// a bulletin's serviceRoster, by matching the schedule's dates against the
// bulletin's own date (thisWeek <- the bulletin's Sunday, nextWeek <- the
// following Sunday) — so a schedule only needs to be uploaded once to keep
// filling in "本週/下週" as new bulletins are drafted, instead of an officer
// re-typing it every week.

import { ChurchService, RosterRow, RosterScheduleEntry } from '../types/bulletin';
import { parseChineseDate } from './chineseDate';
import { toIsoDate } from './dateNormalize';

const STORAGE_KEY = 'rosterSchedule';

export function loadRosterSchedule(): RosterScheduleEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RosterScheduleEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveRosterSchedule(entries: RosterScheduleEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Best-effort — the schedule still applies for this session even if it
    // can't be persisted (e.g. private browsing).
  }
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function rosterKey(section: string, role: string): string {
  return `${section}␟${role}`;
}

export function applyRosterScheduleToService(
  service: ChurchService,
  schedule: RosterScheduleEntry[]
): ChurchService {
  if (schedule.length === 0) return service;
  const serviceDate = parseChineseDate(service.date);
  if (!serviceDate) return service;

  const thisIso = toIsoDate(serviceDate);
  const nextIso = addDays(thisIso, 7);

  const thisWeekMap = new Map<string, string>();
  const nextWeekMap = new Map<string, string>();
  schedule.forEach((entry) => {
    if (entry.date === thisIso) thisWeekMap.set(rosterKey(entry.section, entry.role), entry.name);
    else if (entry.date === nextIso) nextWeekMap.set(rosterKey(entry.section, entry.role), entry.name);
  });
  if (thisWeekMap.size === 0 && nextWeekMap.size === 0) return service;

  const seen = new Set<string>();
  const updatedRows: RosterRow[] = service.serviceRoster.map((row) => {
    const key = rosterKey(row.section, row.role);
    seen.add(key);
    const thisWeek = thisWeekMap.get(key) ?? row.thisWeek;
    const nextWeek = nextWeekMap.get(key) ?? row.nextWeek;
    return thisWeek === row.thisWeek && nextWeek === row.nextWeek ? row : { ...row, thisWeek, nextWeek };
  });

  const allKeys = new Set([...thisWeekMap.keys(), ...nextWeekMap.keys()]);
  let extra = 0;
  allKeys.forEach((key) => {
    if (seen.has(key)) return;
    const [section, role] = key.split('␟');
    extra += 1;
    updatedRows.push({
      id: `sched-${Date.now().toString(36)}-${extra}`,
      section,
      role,
      thisWeek: thisWeekMap.get(key) ?? '--',
      nextWeek: nextWeekMap.get(key) ?? '--',
    });
  });

  return { ...service, serviceRoster: updatedRows };
}

export function applyRosterScheduleToServices(
  services: ChurchService[],
  schedule: RosterScheduleEntry[]
): ChurchService[] {
  return services.map((s) => applyRosterScheduleToService(s, schedule));
}
