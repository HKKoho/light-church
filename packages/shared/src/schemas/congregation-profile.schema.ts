import { z } from 'zod';

export const AGE_BANDS = [
  'under11',
  '11to17',
  '18to24',
  '25to34',
  '35to49',
  '50to74',
  'over75',
] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const ECONOMIC_TIERS = ['poor', 'belowAverage', 'average', 'aboveAverage', 'rich'] as const;
export type EconomicTier = (typeof ECONOMIC_TIERS)[number];

export const MBTI_TYPES = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENTP',
  'ESTJ',
  'ESFJ',
  'ENFJ',
  'ENTJ',
] as const;
export type MbtiType = (typeof MBTI_TYPES)[number];

export const ENNEAGRAM_TYPES = [
  'type1',
  'type2',
  'type3',
  'type4',
  'type5',
  'type6',
  'type7',
  'type8',
  'type9',
] as const;
export type EnneagramType = (typeof ENNEAGRAM_TYPES)[number];

export const GOVERNANCE_MODELS = ['centralized', 'decentralized'] as const;
export type GovernanceModel = (typeof GOVERNANCE_MODELS)[number];

const pct = z.number().min(0).max(100);

export const congregationProfileSchema = z.object({
  governanceModel: z.enum(GOVERNANCE_MODELS).default('centralized'),
  ageUnder11Pct: pct.default(0),
  age11to17Pct: pct.default(0),
  age18to24Pct: pct.default(0),
  age25to34Pct: pct.default(0),
  age35to49Pct: pct.default(0),
  age50to74Pct: pct.default(0),
  ageOver75Pct: pct.default(0),
  economicPoorPct: pct.default(0),
  economicBelowAvgPct: pct.default(0),
  economicAveragePct: pct.default(0),
  economicAboveAvgPct: pct.default(0),
  economicRichPct: pct.default(0),
  ethnicGroups: z.array(z.string().min(1).max(100)).default([]),
  educationLevels: z.array(z.string().min(1).max(100)).default([]),
});

export const updateCongregationProfileSchema = congregationProfileSchema.partial();

export type CongregationProfileInput = z.infer<typeof congregationProfileSchema>;
export type UpdateCongregationProfileInput = z.infer<typeof updateCongregationProfileSchema>;
