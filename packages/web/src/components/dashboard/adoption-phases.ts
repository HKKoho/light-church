/**
 * AI adoption phases (see docs/AI_ADOPTION_PHASES.md), mapped onto the AIbyML
 * Industry Playbook tiers. The sidebar groups its nav by phase; any phase whose
 * status isn't `live` is labelled "TO BE CONSTRUCTED" until it ships.
 *
 * To complete a phase, flip its `status` to 'live' (and the next to 'building').
 */
export type AdoptionPhaseId = '1' | '2' | '3a' | '3b' | '3c';
export type AdoptionPhaseStatus = 'live' | 'building' | 'planned';

export interface AdoptionPhase {
  readonly id: AdoptionPhaseId;
  readonly status: AdoptionPhaseStatus;
  /** false = the phase has no sidebar group (its pages stay reachable by URL). */
  readonly inSidebar: boolean;
  /** false = the public landing page hides this phase's cards and features. */
  readonly onLanding: boolean;
}

export const ADOPTION_PHASES: Readonly<Record<AdoptionPhaseId, AdoptionPhase>> = {
  '1': { id: '1', status: 'building', inSidebar: true, onLanding: true }, // AI as a Tool — Tier 3
  '2': { id: '2', status: 'planned', inSidebar: true, onLanding: true }, // AI as a Worker / Volunteer — Tier 2b
  // Hidden for now; Pastoral Care stays reachable via the header Care & Governance menu.
  '3a': { id: '3a', status: 'planned', inSidebar: false, onLanding: false }, // Delegated ministry & pastoral care — Tier 2a
  // Its items live in the header Finance & Stewardship menu (ministries-nav.tsx).
  '3b': { id: '3b', status: 'planned', inSidebar: false, onLanding: false }, // Governance, assurance & liability
  // Its items live in the header Bible & Ministries menu (ministries-nav.tsx).
  '3c': { id: '3c', status: 'planned', inSidebar: false, onLanding: false }, // Data & domain curation
};

/** Landing-page content tagged with a phase is shown only if that phase is `onLanding`. */
export function isOnLanding(id: AdoptionPhaseId | undefined): boolean {
  return id === undefined || ADOPTION_PHASES[id].onLanding;
}

export function isPhaseConstructed(id: AdoptionPhaseId): boolean {
  return ADOPTION_PHASES[id].status !== 'planned';
}
