// packages/api/src/theology-library/__tests__/assistant.test.ts
import type { TheologyPassage } from '@clawix/shared';
import { describe, expect, it, vi } from 'vitest';

import type { OneShotLlmService } from '../../engine/one-shot/one-shot-llm.service.js';
import {
  NO_PASSAGES_ANSWER,
  buildSystemPrompt,
  buildUserPrompt,
  searchQueryFor,
} from '../assistant.prompts.js';
import { TheologyAssistantService } from '../assistant.service.js';
import type { TheologySearchService } from '../search.service.js';

const passage = (n: number): TheologyPassage => ({
  chunkId: `c${n}`,
  sourceId: `s${n}`,
  sourceTitle: `Book ${n}`,
  author: n === 1 ? 'Augustine' : null,
  kind: 'book',
  page: n === 1 ? 12 : null,
  heading: n === 1 ? 'On Grace' : '',
  text: `Passage ${n} text`,
  scriptureRefs: [],
  score: 0.03,
});

describe('assistant prompts', () => {
  it('frames answers in the Nicene faith and the chosen focus and language', () => {
    expect(buildSystemPrompt('church_history', 'en')).toMatch(/Nicene Creed[\s\S]*church history/);
    expect(buildSystemPrompt('systematic', 'zh-TW')).toMatch(/尼西亞信經[\s\S]*系統神學/);
  });

  it('numbers passages with their source details', () => {
    const prompt = buildUserPrompt('What is grace?', [passage(1), passage(2)]);
    expect(prompt).toContain('[1] Book 1 · Augustine · p. 12 · On Grace\nPassage 1 text');
    expect(prompt).toContain('[2] Book 2\nPassage 2 text');
    expect(prompt.endsWith('Question: What is grace?')).toBe(true);
  });

  it('adds the previous question to a short follow-up', () => {
    const history = [
      { role: 'user' as const, content: 'Who was Athanasius?' },
      { role: 'assistant' as const, content: 'A bishop.' },
    ];
    expect(searchQueryFor('Why?', history)).toBe('Who was Athanasius?\nWhy?');
    expect(searchQueryFor('Why?', [])).toBe('Why?');
    const long = 'What did the Council of Chalcedon teach about Christ?';
    expect(searchQueryFor(long, history)).toBe(long);
  });
});

describe('TheologyAssistantService', () => {
  function make(passages: TheologyPassage[]) {
    const search = { search: vi.fn(async () => passages) };
    const llm = { chat: vi.fn(async () => ({ content: 'Grace is a gift [1].' })) };
    const service = new TheologyAssistantService(
      search as unknown as TheologySearchService,
      llm as unknown as OneShotLlmService,
    );
    return { service, search, llm };
  }
  const input = {
    question: 'What is grace?',
    mode: 'general' as const,
    language: 'en' as const,
    history: [{ role: 'user' as const, content: 'Hello' }],
  };

  it('answers from passages and returns them as citations', async () => {
    const { service, search, llm } = make([passage(1)]);
    const answer = await service.ask({ ...input, doctrineTags: ['reformed'] }, 'u1');
    expect(answer).toEqual({
      answer: 'Grace is a gift [1].',
      citations: [passage(1)],
      grounded: true,
    });
    expect(search.search).toHaveBeenCalledWith(
      expect.objectContaining({ doctrineTags: ['reformed'], userId: 'u1', topK: 8 }),
    );
    const call = llm.chat.mock.calls[0] as unknown as [{ messages: { role: string }[] }];
    expect(call[0].messages.map((m) => m.role)).toEqual(['system', 'user', 'user']);
  });

  it('says the library has nothing, without calling the model', async () => {
    const { service, llm } = make([]);
    const answer = await service.ask({ ...input, language: 'zh-TW' }, 'u1');
    expect(answer).toEqual({ answer: NO_PASSAGES_ANSWER['zh-TW'], citations: [], grounded: false });
    expect(llm.chat).not.toHaveBeenCalled();
  });
});
