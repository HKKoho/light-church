// Clears what this browser has kept for one church, so the officer can start
// that church over. Inside Light Church it also archives the shared bulletins
// (they stay in Postgres; uploading the same PDFs again reads them afresh).
// The Postgres PDF archive and other churches' browser data are left alone.

import { deleteBulletinFiles } from './bulletinDrive';
import { resetSharedBulletins } from './bulletinStore';

// Roster schedule and sermon plan are saved without a church name, so they
// belong to whichever church this browser is using (App saves it on start).
const UNTAGGED_KEYS = ['rosterSchedule', 'sermonPlan'];
const ANALYSIS_KEY = 'bulletinFormatAnalysis';

function currentChurchName(fallback: string): string {
  try {
    return localStorage.getItem('churchName')?.trim() || fallback;
  } catch {
    return fallback;
  }
}

function removeAnalysisFor(churchName: string): boolean {
  try {
    const raw = localStorage.getItem(ANALYSIS_KEY);
    if (!raw || JSON.parse(raw)?.churchName !== churchName) return false;
    localStorage.removeItem(ANALYSIS_KEY);
    return true;
  } catch {
    return false;
  }
}

export interface ChurchResetResult {
  pdfs: number;
  /** Shared bulletins archived, or null when there is no Light Church server. */
  bulletins: number | null;
  /** Whether the roster schedule and sermon plan were cleared too. */
  clearedPlans: boolean;
  clearedAnalysis: boolean;
}

/**
 * Deletes this browser's uploaded PDFs and format analysis for `churchName`,
 * plus the roster schedule and sermon plan if it is the church in use
 * (`defaultName` stands in when none has been saved yet), and archives the
 * shared bulletins.
 */
export async function resetChurchData(churchName: string, defaultName: string): Promise<ChurchResetResult> {
  const bulletins = await resetSharedBulletins();
  const pdfs = await deleteBulletinFiles(churchName);
  const clearedAnalysis = removeAnalysisFor(churchName);
  let clearedPlans = false;
  if (currentChurchName(defaultName) === churchName) {
    try {
      UNTAGGED_KEYS.forEach((key) => localStorage.removeItem(key));
      clearedPlans = true;
    } catch {
      // localStorage unavailable; nothing was stored there to clear.
    }
  }
  return { pdfs, bulletins, clearedPlans, clearedAnalysis };
}
