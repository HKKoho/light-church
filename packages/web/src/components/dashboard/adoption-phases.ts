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
}

export const ADOPTION_PHASES: Readonly<Record<AdoptionPhaseId, AdoptionPhase>> = {
  '1': { id: '1', status: 'building' }, // AI as a Tool — Tier 3
  '2': { id: '2', status: 'planned' }, // AI as a Worker / Volunteer — Tier 2b
  '3a': { id: '3a', status: 'planned' }, // Delegated ministry & pastoral care — Tier 2a
  '3b': { id: '3b', status: 'planned' }, // Governance, assurance & liability
  '3c': { id: '3c', status: 'planned' }, // Data & domain curation
};

export function isPhaseConstructed(id: AdoptionPhaseId): boolean {
  return ADOPTION_PHASES[id].status !== 'planned';
}
