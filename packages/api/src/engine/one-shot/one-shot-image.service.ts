// packages/api/src/engine/one-shot/one-shot-image.service.ts
//
// A single prompt → image call on Gemini, for AI Tools that design a picture
// (e.g. Event Planning's post design). Uses the church's Gemini key (Settings →
// Providers, or GEMINI_API_KEY) and records token usage like any agent call.
// Never send member personal data here.
import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createLogger } from '@clawix/shared';

import { ProviderConfigService } from '../../provider-config/provider-config.service.js';
import { generateGeminiImage, type GeminiImageResult } from '../providers/gemini-image.js';
import { TokenCounterService } from '../token-counter.service.js';

const logger = createLogger('engine:one-shot-image');

const PROVIDER = 'gemini';
const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';

export interface OneShotImageRequest {
  readonly prompt: string;
  readonly aspectRatio: string;
  readonly userId: string;
  /** Recorded as TokenUsage.agentRunId, e.g. `ai-tool:event-planning`. */
  readonly usageTag: string;
}

@Injectable()
export class OneShotImageService {
  constructor(
    private readonly providerConfig: ProviderConfigService,
    private readonly tokenCounter: TokenCounterService,
  ) {}

  async generate(req: OneShotImageRequest): Promise<GeminiImageResult> {
    const model = process.env['AI_IMAGE_MODEL'] ?? DEFAULT_IMAGE_MODEL;
    let resolved;
    try {
      resolved = await this.providerConfig.resolveProvider(PROVIDER);
    } catch (err) {
      logger.warn({ err }, 'No Gemini key configured for image generation');
      throw new ServiceUnavailableException(
        'Gemini is not configured — a super admin can add a Gemini key under Settings → Providers',
      );
    }

    let result: GeminiImageResult;
    try {
      result = await generateGeminiImage({
        apiKey: resolved.apiKey,
        ...(resolved.apiBaseUrl ? { apiBaseUrl: resolved.apiBaseUrl } : {}),
        model,
        prompt: req.prompt,
        aspectRatio: req.aspectRatio,
      });
    } catch (err) {
      logger.warn({ err, model }, 'Gemini image generation failed');
      throw new BadGatewayException(
        err instanceof Error ? err.message : 'Gemini could not create the image',
      );
    }

    await this.tokenCounter
      .recordUsage({
        response: {
          content: result.text,
          toolCalls: [],
          finishReason: 'stop',
          usage: result.usage,
          thinkingBlocks: null,
        },
        agentRunId: req.usageTag,
        userId: req.userId,
        providerName: PROVIDER,
        model,
      })
      .catch((err: unknown) => {
        logger.warn({ err, usageTag: req.usageTag }, 'Failed to record token usage');
      });

    return result;
  }
}
