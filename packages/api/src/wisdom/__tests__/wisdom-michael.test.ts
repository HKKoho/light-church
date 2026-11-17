import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { askWisdomMichaelSchema, type WisdomModuleDetail } from '@clawix/shared';

import type { OneShotLlmService } from '../../engine/one-shot/one-shot-llm.service.js';
import { buildMichaelPrompt, describeLesson } from '../wisdom-michael.prompt.js';
import { WisdomMichaelService } from '../wisdom-michael.service.js';
import type { WisdomService } from '../wisdom.service.js';

const perspective = (book: string, description = '') => ({
  book,
  theme: `${book} theme`,
  description,
  imageUrl: '',
  imageAlt: '',
  audioUrl: '',
});

const lesson = (extra: Partial<WisdomModuleDetail> = {}): WisdomModuleDetail => ({
  id: 'm1',
  cycleId: 'c1',
  courseId: 'k1',
  title: 'What is wisdom?',
  subtitle: 'Three voices',
  sortOrder: 1,
  status: 'published',
  updatedAt: '2026-10-20T00:00:00.000Z',
  readingLabels: [],
  lifeQuestions: [
    {
      id: 'q1',
      text: 'When did you last feel wise?',
      type: 'open',
      options: [],
      mediaUrl: '',
      imageUrl: '',
      imageAlt: '',
    },
  ],
  perspectives: {
    PROVERBS: perspective('Proverbs 1:7', 'The fear of the Lord'),
    ECCLESIASTES: perspective('Ecclesiastes 1:2'),
    JOB: perspective('Job 28'),
  },
  tensionGuide: 'Order versus chaos',
  tensionGuideAudioUrl: '',
  discussionPrompts: ['Share one story'],
  summary: '',
  ...extra,
});

describe('Michael prompt', () => {
  it('describes the lesson with default reading names and lesson text', () => {
    const text = describeLesson(lesson());

    expect(text).toContain('Title: What is wisdom?');
    expect(text).toContain('Proverbs — Proverbs 1:7 — Proverbs 1:7 theme\nThe fear of the Lord');
    expect(text).toContain('- When did you last feel wise?');
    expect(text).toContain('Tension guide:\nOrder versus chaos');
    expect(text).toContain('- Share one story');
    expect(text).not.toContain('Lesson summary');
  });

  it("uses the course's own reading names (e.g. Get in Bible's books)", () => {
    const text = describeLesson(lesson({ readingLabels: ['馬太福音', '以賽亞書', '保羅書信'] }));

    expect(text).toContain('馬太福音 — Proverbs 1:7');
    expect(text).toContain('保羅書信 — Job 28');
  });

  it('clips very long lesson fields', () => {
    const text = describeLesson(lesson({ tensionGuide: 'x'.repeat(10_000) }));

    expect(text).toContain(`${'x'.repeat(3000)}…`);
    expect(text).not.toContain('x'.repeat(3001));
  });

  it('includes step guidance and the requested reply language', () => {
    const zh = buildMichaelPrompt(lesson(), 'tension', 'zh-TW');
    expect(zh).toContain('tension between the three perspectives');
    expect(zh).toContain('Traditional Chinese');

    const auto = buildMichaelPrompt(lesson(), 'summary', undefined);
    expect(auto).toContain("language of the student's question");
    expect(auto).toContain('<lesson>');
  });
});

describe('WisdomMichaelService', () => {
  const getForMember = vi.fn();
  const chat = vi.fn();
  const service = new WisdomMichaelService(
    { getForMember } as unknown as WisdomService,
    { chat } as unknown as OneShotLlmService,
  );
  const input = askWisdomMichaelSchema.parse({
    step: 'questions',
    question: 'How should I think about this?',
    history: [
      { role: 'user', content: 'Hi Michael' },
      { role: 'assistant', content: 'Hello!' },
    ],
    lang: 'en',
  });

  beforeEach(() => {
    getForMember.mockReset().mockResolvedValue({ module: lesson(), answers: { q1: 'secret' } });
    chat.mockReset().mockResolvedValue({ content: '  Think about a time…  ' });
  });

  it('sends the lesson prompt, recent turns and question, tagged for usage', async () => {
    await expect(service.ask('m1', 'u1', input)).resolves.toEqual({
      reply: 'Think about a time…',
    });

    expect(getForMember).toHaveBeenCalledWith('m1', 'u1');
    const req = chat.mock.calls[0]![0];
    expect(req.userId).toBe('u1');
    expect(req.usageTag).toBe('wisdom:michael');
    expect(req.messages.map((m: { role: string }) => m.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ]);
    expect(req.messages[3].content).toBe('How should I think about this?');
  });

  it("never sends the member's saved answers", async () => {
    await service.ask('m1', 'u1', input);

    expect(JSON.stringify(chat.mock.calls[0]![0])).not.toContain('secret');
  });

  it('returns a polite fallback when the AI call fails', async () => {
    chat.mockRejectedValue(new Error('provider down'));

    const { reply } = await service.ask('m1', 'u1', input);
    expect(reply).toContain("can't answer right now");
  });

  it('returns the Chinese fallback for an empty reply by default', async () => {
    chat.mockResolvedValue({ content: '' });

    const { reply } = await service.ask('m1', 'u1', { ...input, lang: undefined });
    expect(reply).toContain('抱歉');
  });

  it('lets NotFound for unpublished modules propagate', async () => {
    getForMember.mockRejectedValue(new NotFoundException('Module not found'));

    await expect(service.ask('m1', 'u1', input)).rejects.toBeInstanceOf(NotFoundException);
    expect(chat).not.toHaveBeenCalled();
  });
});

describe('askWisdomMichaelSchema', () => {
  it('rejects too much history and unknown steps', () => {
    const turn = { role: 'user', content: 'x' };
    expect(
      askWisdomMichaelSchema.safeParse({
        step: 'questions',
        question: 'q',
        history: Array(7).fill(turn),
      }).success,
    ).toBe(false);
    expect(askWisdomMichaelSchema.safeParse({ step: 'other', question: 'q' }).success).toBe(false);
    expect(askWisdomMichaelSchema.safeParse({ step: 'summary', question: '   ' }).success).toBe(
      false,
    );
  });
});
