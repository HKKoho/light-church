// packages/api/src/theology-library/assistant.service.ts
//
// The Theology Assistant: retrieve approved passages, then have the church's
// default model answer from them with numbered citations. Calls go through
// OneShotLlmService so usage is accounted for. No member data is sent.
import { Injectable } from '@nestjs/common';
import type { ChatMessage, TheologyAnswer, TheologyAskData } from '@clawix/shared';

import { OneShotLlmService } from '../engine/one-shot/one-shot-llm.service.js';
import {
  NO_PASSAGES_ANSWER,
  buildSystemPrompt,
  buildUserPrompt,
  searchQueryFor,
} from './assistant.prompts.js';
import { TheologySearchService } from './search.service.js';

const USAGE_TAG = 'theology-assistant';
const PASSAGES_PER_ANSWER = 8;

@Injectable()
export class TheologyAssistantService {
  constructor(
    private readonly search: TheologySearchService,
    private readonly llm: OneShotLlmService,
  ) {}

  async ask(input: TheologyAskData, userId: string): Promise<TheologyAnswer> {
    const passages = await this.search.search({
      query: searchQueryFor(input.question, input.history).slice(0, 500),
      topK: PASSAGES_PER_ANSWER,
      ...(input.doctrineTags ? { doctrineTags: input.doctrineTags } : {}),
      userId,
      usageTag: USAGE_TAG,
    });
    if (passages.length === 0) {
      return { answer: NO_PASSAGES_ANSWER[input.language], citations: [], grounded: false };
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(input.mode, input.language) },
      ...input.history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: buildUserPrompt(input.question, passages) },
    ];
    const response = await this.llm.chat({
      messages,
      userId,
      usageTag: USAGE_TAG,
      settings: { temperature: 0.3 },
    });
    return { answer: response.content ?? '', citations: passages, grounded: true };
  }
}
