// packages/api/src/ai-survey/ai-survey.service.ts
//
// AI Survey: a topic goes to the church's cloud AI provider (through the
// engine, for token accounting), which drafts a questionnaire; after a person
// reviews it, the draft is published as a Google Form via the church's
// service account and shared with the publisher. Only the topic and audience
// the user typed are sent — never member data.
import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AI_PUBLISH_ROLES,
  surveyDraftSchema,
  surveyQuestionSchema,
  type GenerateSurveyInput,
  type PublishedSurvey,
  type SurveyDraft,
} from '@clawix/shared';

import { ConnectorSettingsService } from '../connectors/connector-settings.service.js';
import { GoogleFormsClient } from '../connectors/google-forms.client.js';
import { AuditLogRepository } from '../db/audit-log.repository.js';
import { OneShotLlmService } from '../engine/one-shot/one-shot-llm.service.js';

export interface Actor {
  readonly id: string;
  readonly role: string;
  readonly email: string | null;
}

const SYSTEM_PROMPT = `You design clear, respectful questionnaires for a Christian church.
Write questions a volunteer can answer in a few minutes. Avoid leading or
intrusive questions; never ask for ID numbers, addresses or health details.
Reply with JSON only, no prose and no code fences.`;

export function buildPrompt(input: GenerateSurveyInput): string {
  const lang = input.language === 'zh-TW' ? 'Traditional Chinese (Hong Kong usage)' : 'English';
  return `Topic: ${input.topic}
${input.audience ? `Audience: ${input.audience}\n` : ''}Write ${input.questionCount} questions in ${lang}.
Use a mix of types: "single" (one choice), "multiple" (checkboxes), "scale" (1–5),
"short" (one line) and "paragraph" (open answer). Choice questions need 2–8 options.
Return: {"title": "", "description": "", "questions": [{"title": "", "type": "single", "required": true, "options": [""]}]}`;
}

/** Extracts and validates the model's JSON reply (tolerates code fences / stray prose). */
export function parseDraft(reply: string): SurveyDraft {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new BadGatewayException('The AI reply did not contain a questionnaire');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(reply.slice(start, end + 1));
  } catch {
    throw new BadGatewayException('The AI reply was not valid JSON — please try again');
  }
  // Drop malformed questions instead of failing the whole draft.
  const obj = (raw ?? {}) as { questions?: unknown };
  const questions = Array.isArray(obj.questions) ? obj.questions : [];
  const kept = questions.filter((q) => surveyQuestionSchema.safeParse(q).success);
  const result = surveyDraftSchema.safeParse({ ...obj, questions: kept });
  if (!result.success) {
    throw new BadGatewayException('The AI questionnaire was incomplete — please try again');
  }
  return result.data;
}

@Injectable()
export class AiSurveyService {
  constructor(
    private readonly llm: OneShotLlmService,
    private readonly connectors: ConnectorSettingsService,
    private readonly audit: AuditLogRepository,
  ) {}

  private assertAllowed(actor: Actor): void {
    if (!AI_PUBLISH_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Only ministry leaders and staff can use AI Survey');
    }
  }

  async generate(input: GenerateSurveyInput, actor: Actor): Promise<SurveyDraft> {
    this.assertAllowed(actor);
    const reply = await this.llm.complete({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(input),
      userId: actor.id,
      usageTag: 'ai-tool:ai-survey',
      temperature: 0.4,
    });
    const draft = parseDraft(reply);
    await this.audit.create({
      userId: actor.id,
      action: 'ai-survey.generate',
      resource: 'ai-survey',
      resourceId: 'draft',
      details: { questions: draft.questions.length, language: input.language },
    });
    return draft;
  }

  async publish(draft: SurveyDraft, actor: Actor): Promise<PublishedSurvey> {
    this.assertAllowed(actor);
    const account = await this.connectors.google();
    if (!account) {
      throw new ServiceUnavailableException(
        'Google Forms is not connected — a super admin can add it under Settings → Connectors',
      );
    }
    const published = await new GoogleFormsClient(account).createForm(draft, actor.email);
    await this.audit.create({
      userId: actor.id,
      action: 'ai-survey.publish',
      resource: 'ai-survey',
      resourceId: published.formId,
      details: { questions: draft.questions.length, sharedWith: published.sharedWith !== null },
    });
    return published;
  }
}
