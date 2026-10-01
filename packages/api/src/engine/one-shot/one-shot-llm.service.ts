// packages/api/src/engine/one-shot/one-shot-llm.service.ts
//
// A single prompt → reply call on the church's default cloud provider, for AI
// Tools that need one generation (e.g. AI Survey's questionnaire draft) rather
// than an agent run. Goes through engine/providers and records token usage so
// it is accounted for like any agent call. Never send member personal data here.
import { Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import {
  createLogger,
  findProviderByName,
  type ChatMessage,
  type GenerationSettings,
  type LLMResponse,
  type ToolDefinition,
} from '@clawix/shared';

import { ProviderConfigService } from '../../provider-config/provider-config.service.js';
import { createProvider } from '../providers/provider-factory.js';
import { TokenCounterService } from '../token-counter.service.js';

const logger = createLogger('engine:one-shot-llm');

const FALLBACK_PROVIDER = 'anthropic';

export interface OneShotRequest {
  readonly system: string;
  readonly prompt: string;
  readonly userId: string;
  /** Recorded as TokenUsage.agentRunId, e.g. `ai-tool:ai-survey`. */
  readonly usageTag: string;
  readonly temperature?: number;
  /** Lower is faster on reasoning models — for plain transcription work. */
  readonly reasoningEffort?: GenerationSettings['reasoningEffort'];
}

export interface OneShotChatRequest {
  readonly messages: readonly ChatMessage[];
  readonly userId: string;
  /** Recorded as TokenUsage.agentRunId, e.g. `help-assistant`. */
  readonly usageTag: string;
  readonly tools?: readonly ToolDefinition[];
  readonly settings?: GenerationSettings;
}

interface ProviderFactory {
  readonly create: typeof createProvider;
}

@Injectable()
export class OneShotLlmService {
  private readonly factory: ProviderFactory;

  constructor(
    private readonly providerConfig: ProviderConfigService,
    private readonly tokenCounter: TokenCounterService,
    @Optional() factory?: ProviderFactory,
  ) {
    this.factory = factory ?? { create: createProvider };
  }

  /** Returns the model's text reply. */
  async complete(req: OneShotRequest): Promise<string> {
    const settings: GenerationSettings = {
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...(req.reasoningEffort !== undefined ? { reasoningEffort: req.reasoningEffort } : {}),
    };
    const response = await this.chat({
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt },
      ],
      userId: req.userId,
      usageTag: req.usageTag,
      settings,
    });
    return response.content ?? '';
  }

  /**
   * One multi-turn call, optionally offering tools. The caller runs any tool
   * calls in the response and calls again — a bounded loop, not an agent run.
   */
  async chat(req: OneShotChatRequest): Promise<LLMResponse> {
    const providerName = (await this.providerConfig.getDefaultProviderName()) ?? FALLBACK_PROVIDER;
    const model = process.env['AI_TOOLS_MODEL'] ?? findProviderByName(providerName)?.defaultModel;
    if (!model) {
      throw new ServiceUnavailableException(
        `No model known for provider "${providerName}" — set AI_TOOLS_MODEL`,
      );
    }

    let resolved;
    try {
      resolved = await this.providerConfig.resolveProvider(providerName);
    } catch (err) {
      logger.warn({ err, providerName }, 'No AI provider configured for AI Tools');
      throw new ServiceUnavailableException('No AI provider is configured — ask an administrator');
    }

    const provider = this.factory.create(
      providerName,
      resolved.apiKey,
      resolved.apiBaseUrl ?? undefined,
      model,
    );
    const settings = req.settings ?? {};
    const response = await provider.chat(req.messages, {
      model,
      ...(req.tools && req.tools.length > 0 ? { tools: req.tools } : {}),
      ...(Object.keys(settings).length > 0 ? { settings } : {}),
    });

    await this.tokenCounter
      .recordUsage({
        response,
        agentRunId: req.usageTag,
        userId: req.userId,
        providerName,
        model,
      })
      .catch((err: unknown) => {
        logger.warn({ err, usageTag: req.usageTag }, 'Failed to record token usage');
      });

    return response;
  }
}
