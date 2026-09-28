// Rebuilding already-made drafts from a newer base — typically a past
// bulletin AI has just read from an uploaded PDF, which arrives after the
// coming/next Sunday drafts were derived from an older one.
//
// Auto-derived drafts carry a fingerprint of their content at creation, so a
// draft nobody has touched since can be rebuilt without asking, while one an
// officer has edited is only replaced with their say-so.

import { ChurchService, RosterScheduleEntry, SermonPlanEntry } from '../types/bulletin';
import { parseChineseDate } from './chineseDate';
import { deriveNextBulletin, findLastBulletin } from './deriveNextBulletin';
import { applyRosterScheduleToService } from './rosterSchedule';
import { applySermonPlanToService } from './sermonPlan';

// Key-sorted, so the fingerprint survives a round trip through Postgres jsonb
// (which reorders object keys).
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// FNV-1a — only has to tell "unchanged" from "changed", not resist tampering.
function fingerprint(service: ChurchService): string {
  const { derivedFingerprint: _ignored, ...content } = service;
  const text = stableStringify(content);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36) + '-' + text.length.toString(36);
}

/** Records `service`'s current content as its as-derived state. */
export function markDerived(service: ChurchService): ChurchService {
  return { ...service, derivedFingerprint: fingerprint(service) };
}

/** A draft still exactly as the system derived it, i.e. safe to rebuild without asking. */
export function isUntouchedDraft(service: ChurchService): boolean {
  return (
    service.status === 'draft' &&
    !!service.derivedFingerprint &&
    service.derivedFingerprint === fingerprint(service)
  );
}

/**
 * Applies a system change (e.g. a re-uploaded roster schedule) to `service`
 * without making an untouched draft look edited.
 */
export function updateKeepingUntouched(
  service: ChurchService,
  change: (s: ChurchService) => ChurchService
): ChurchService {
  const untouched = isUntouchedDraft(service);
  const updated = change(service);
  return untouched ? markDerived(updated) : updated;
}

const time = (s: ChurchService) => parseChineseDate(s.date)?.getTime() ?? 0;

/**
 * The drafts dated after `fromId` that a rebuild would replace, and the
 * bulletin they would be rebuilt from — the latest bulletin once those drafts
 * are set aside, which is `fromId` itself unless a later non-draft exists.
 */
export function findDraftsToRebuild(
  services: ChurchService[],
  fromId: string
): { base: ChurchService; drafts: ChurchService[] } | null {
  const from = services.find((s) => s.id === fromId);
  if (!from) return null;
  const isLaterDraft = (s: ChurchService) => s.status === 'draft' && time(s) > time(from);
  const base = findLastBulletin(services.filter((s) => !isLaterDraft(s)));
  const drafts = services.filter((s) => isLaterDraft(s) && time(s) > time(base));
  return drafts.length > 0 ? { base, drafts } : null;
}

/**
 * Re-derives each of `drafts` week by week from `base`, keeping each draft's
 * id (so it saves over the old one and stays selected) and leaving every
 * other bulletin as it is.
 */
export function rebuildDrafts(
  services: ChurchService[],
  base: ChurchService,
  drafts: ChurchService[],
  rosterSchedule: RosterScheduleEntry[],
  sermonPlan: SermonPlanEntry[]
): ChurchService[] {
  const lastTime = Math.max(...drafts.map(time));
  const byTime = new Map(drafts.map((d) => [time(d), d]));
  const rebuilt = new Map<string, ChurchService>();

  let step = base;
  // Weekly steps can't outrun the latest draft by more than one; the cap only
  // guards against an unparseable date.
  for (let week = 0; week < 520 && time(step) < lastTime; week++) {
    step = applyRosterScheduleToService(deriveNextBulletin(step), rosterSchedule);
    const old = byTime.get(time(step));
    if (old) {
      rebuilt.set(old.id, markDerived({ ...applySermonPlanToService(step, sermonPlan), id: old.id }));
    }
  }

  return services.map((s) => rebuilt.get(s.id) ?? s);
}
