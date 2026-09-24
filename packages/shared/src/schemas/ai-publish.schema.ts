import { z } from 'zod';

// AI Survey (topic → AI-drafted questionnaire → Google Form) and QR Registration
// (event details + registration link → QR page deployed to Vercel). Both publish
// through church-wide connectors a super_admin configures under Settings.

/** Roles that may draft surveys and publish survey / registration pages. */
export const AI_PUBLISH_ROLES: readonly string[] = [
  'super_admin',
  'senior_pastor',
  'pastor',
  'admin_staff',
  'ministry_leader',
];

const text = (max: number) => z.string().trim().max(max);

export const SURVEY_QUESTION_TYPES = ['short', 'paragraph', 'single', 'multiple', 'scale'] as const;
export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];

export const surveyQuestionSchema = z
  .object({
    title: text(300).min(1),
    type: z.enum(SURVEY_QUESTION_TYPES),
    required: z.boolean().default(false),
    /** Choices for `single` / `multiple`; ignored for other types. */
    options: z.array(text(150).min(1)).max(20).default([]),
  })
  .refine((q) => (q.type !== 'single' && q.type !== 'multiple') || q.options.length >= 2, {
    message: 'Choice questions need at least two options',
    path: ['options'],
  });
export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;

export const generateSurveySchema = z.object({
  topic: text(500).min(3),
  audience: text(200).default(''),
  questionCount: z.number().int().min(3).max(20).default(8),
  language: z.enum(['en', 'zh-TW']).default('en'),
});
export type GenerateSurveyInput = z.infer<typeof generateSurveySchema>;

export const surveyDraftSchema = z.object({
  title: text(200).min(1),
  description: text(1000).default(''),
  questions: z.array(surveyQuestionSchema).min(1).max(30),
});
export type SurveyDraft = z.infer<typeof surveyDraftSchema>;

export interface PublishedSurvey {
  readonly formId: string;
  /** Link respondents open. */
  readonly responderUrl: string;
  /** Link for editing the form (shared with the publisher's email). */
  readonly editUrl: string;
  readonly sharedWith: string | null;
}

const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(2000)
  .refine((u) => /^https?:\/\//i.test(u), 'Use an http(s) link');

export const qrRegistrationSchema = z.object({
  eventName: text(200).min(1),
  date: text(100).default(''),
  time: text(100).default(''),
  location: text(300).default(''),
  description: text(2000).default(''),
  registrationUrl: httpsUrl,
  language: z.enum(['en', 'zh-TW']).default('en'),
});
export type QrRegistrationInput = z.infer<typeof qrRegistrationSchema>;

export interface PublishedQrPage {
  readonly url: string;
  readonly deploymentId: string;
}

export interface ConnectorStatus {
  readonly google: { readonly configured: boolean; readonly clientEmail: string | null };
  readonly vercel: {
    readonly configured: boolean;
    readonly teamId: string | null;
    readonly projectName: string;
  };
}

export const updateConnectorsSchema = z.object({
  /** Google service-account key file (JSON text); empty string removes it. */
  googleServiceAccountJson: z.string().max(20_000).optional(),
  /** Vercel access token; empty string removes it. */
  vercelToken: z.string().trim().max(500).optional(),
  vercelTeamId: z.string().trim().max(100).optional(),
  vercelProjectName: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{0,99}$/, 'Lower-case letters, digits and dashes')
    .optional(),
});
export type UpdateConnectorsInput = z.infer<typeof updateConnectorsSchema>;
