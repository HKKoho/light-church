// packages/api/src/wisdom/wisdom-michael.service.ts
//
// Michael, the lesson teaching assistant: one bounded AI call per question on
// the church's default provider (via OneShotLlmService, so usage is accounted
// for). Not an agent run — nothing is stored, and only the lesson text plus
// the member's question and recent turns are sent, never their saved answers.
import { Injectable } from '@nestjs/common';
import { createLogger, type AskWisdomMichaelData, type WisdomMichaelReply } from '@clawix/shared';

import { OneShotLlmService } from '../engine/one-shot/one-shot-llm.service.js';
import { buildMichaelPrompt } from './wisdom-michael.prompt.js';
import { WisdomService } from './wisdom.service.js';

const logger = createLogger('wisdom:michael');

const USAGE_TAG = 'wisdom:michael';
const MAX_REPLY_TOKENS = 800;
const FALLBACK_REPLY = {
  en: "Sorry, I can't answer right now. Please try again in a moment, or keep exploring the lesson.",
  'zh-TW': '抱歉，我現在無法回應。請稍後再試，或者繼續探索課程內容。',
} as const;

@Injectable()
export class WisdomMichaelService {
  constructor(
    private readonly wisdom: WisdomService,
    private readonly llm: OneShotLlmService,
  ) {}

  /** Throws NotFound for modules the member cannot see; AI failures become a polite reply. */
  async ask(
    moduleId: string,
    userId: string,
    input: AskWisdomMichaelData,
  ): Promise<WisdomMichaelReply> {
    const { module } = await this.wisdom.getForMember(moduleId, userId);
    const fallback = FALLBACK_REPLY[input.lang ?? 'zh-TW'];

    try {
      const response = await this.llm.chat({
        messages: [
          { role: 'system', content: buildMichaelPrompt(module, input.step, input.lang) },
          ...input.history.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: input.question },
        ],
        userId,
        usageTag: USAGE_TAG,
        settings: { temperature: 0.7, maxTokens: MAX_REPLY_TOKENS },
      });
      return { reply: response.content?.trim() || fallback };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ moduleId, step: input.step, error: message }, 'Michael reply failed');
      return { reply: fallback };
    }
  }
}
