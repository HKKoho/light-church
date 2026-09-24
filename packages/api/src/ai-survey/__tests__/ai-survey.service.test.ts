// packages/api/src/ai-survey/__tests__/ai-survey.service.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ConnectorSettingsService } from '../../connectors/connector-settings.service.js';
import { GoogleFormsClient } from '../../connectors/google-forms.client.js';
import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { OneShotLlmService } from '../../engine/one-shot/one-shot-llm.service.js';
import { AiSurveyService, buildPrompt, parseDraft } from '../ai-survey.service.js';

const REPLY = `Here you go:
\`\`\`json
{"title": "Retreat feedback", "description": "Thanks!", "questions": [
  {"title": "How was it?", "type": "scale", "required": true},
  {"title": "Favourite part", "type": "single", "options": ["Worship", "Talks"]},
  {"title": "Broken", "type": "single", "options": ["Only one"]},
  {"title": "Anything else?", "type": "paragraph"}
]}
\`\`\``;

const leader = { id: 'u1', role: 'ministry_leader', email: 'lee@church.org' };
const volunteer = { id: 'u2', role: 'volunteer', email: null };

function makeService(opts: { google?: boolean } = {}) {
  const llm = { complete: vi.fn(async () => REPLY) };
  const connectors = {
    google: vi.fn(async () => (opts.google ? { clientEmail: 'x', privateKey: 'y' } : null)),
  };
  const audit = { create: vi.fn(async () => ({})) };
  const service = new AiSurveyService(
    llm as unknown as OneShotLlmService,
    connectors as unknown as ConnectorSettingsService,
    audit as unknown as AuditLogRepository,
  );
  return { service, llm, audit };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildPrompt', () => {
  it('asks for the requested count, language and audience', () => {
    const prompt = buildPrompt({
      topic: 'Youth retreat',
      audience: 'teenagers',
      questionCount: 6,
      language: 'zh-TW',
    });
    expect(prompt).toContain('Write 6 questions in Traditional Chinese');
    expect(prompt).toContain('Audience: teenagers');
    expect(
      buildPrompt({ topic: 'x', audience: '', questionCount: 3, language: 'en' }),
    ).not.toContain('Audience');
  });
});

describe('parseDraft', () => {
  it('extracts JSON from prose and drops malformed questions', () => {
    const draft = parseDraft(REPLY);
    expect(draft.title).toBe('Retreat feedback');
    expect(draft.questions.map((q) => q.title)).toEqual([
      'How was it?',
      'Favourite part',
      'Anything else?',
    ]);
    expect(draft.questions[1]?.required).toBe(false);
  });

  it('rejects replies without a usable questionnaire', () => {
    expect(() => parseDraft('no json here')).toThrow(/did not contain/);
    expect(() => parseDraft('{not json}')).toThrow(/not valid JSON/);
    expect(() => parseDraft('{"title": "T", "questions": []}')).toThrow(/incomplete/);
  });
});

describe('AiSurveyService', () => {
  const input = { topic: 'Retreat', audience: '', questionCount: 4, language: 'en' as const };

  it('drafts a survey through the engine and audits it', async () => {
    const { service, llm, audit } = makeService();
    const draft = await service.generate(input, leader);
    expect(draft.questions).toHaveLength(3);
    expect(llm.complete).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', usageTag: 'ai-tool:ai-survey' }),
    );
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ai-survey.generate' }),
    );
  });

  it('refuses roles outside ministry leaders and staff', async () => {
    const { service, llm } = makeService();
    await expect(service.generate(input, volunteer)).rejects.toThrow(/ministry leaders/);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('needs the Google connector to publish', async () => {
    const { service } = makeService();
    await expect(service.publish(parseDraft(REPLY), leader)).rejects.toThrow(/not connected/);
  });

  it('publishes to Google Forms shared with the publisher', async () => {
    const created = {
      formId: 'f1',
      responderUrl: 'https://forms.gle/x',
      editUrl: 'https://docs.google.com/forms/d/f1/edit',
      sharedWith: 'lee@church.org',
    };
    const spy = vi.spyOn(GoogleFormsClient.prototype, 'createForm').mockResolvedValue(created);
    const { service, audit } = makeService({ google: true });
    expect(await service.publish(parseDraft(REPLY), leader)).toEqual(created);
    expect(spy).toHaveBeenCalledWith(expect.anything(), 'lee@church.org');
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ai-survey.publish', resourceId: 'f1' }),
    );
  });
});
