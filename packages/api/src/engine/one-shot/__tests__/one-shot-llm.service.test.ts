// packages/api/src/engine/one-shot/__tests__/one-shot-llm.service.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProviderConfigService } from '../../../provider-config/provider-config.service.js';
import type { TokenCounterService } from '../../token-counter.service.js';
import { OneShotLlmService } from '../one-shot-llm.service.js';

const response = {
  content: '{"ok":true}',
  toolCalls: [],
  finishReason: 'stop',
  usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
  thinkingBlocks: null,
};

function makeService(opts: { defaultProvider?: string | null; resolveFails?: boolean } = {}) {
  const providerConfig = {
    getDefaultProviderName: vi.fn(async () => opts.defaultProvider ?? null),
    resolveProvider: vi.fn(async () => {
      if (opts.resolveFails) throw new Error('missing');
      return { apiKey: 'key', apiBaseUrl: null };
    }),
  };
  const tokenCounter = { recordUsage: vi.fn(async () => {}) };
  const chat = vi.fn(async () => response);
  const create = vi.fn(() => ({ name: 'p', chat }));
  const service = new OneShotLlmService(
    providerConfig as unknown as ProviderConfigService,
    tokenCounter as unknown as TokenCounterService,
    { create } as never,
  );
  return { service, create, chat, tokenCounter };
}

const req = { system: 'sys', prompt: 'hi', userId: 'u1', usageTag: 'ai-tool:test' };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('OneShotLlmService', () => {
  it('calls the default provider and records token usage', async () => {
    const { service, create, chat, tokenCounter } = makeService({ defaultProvider: 'openai' });
    expect(await service.complete({ ...req, temperature: 0.2 })).toBe('{"ok":true}');
    expect(create).toHaveBeenCalledWith('openai', 'key', undefined, 'gpt-5');
    expect(chat).toHaveBeenCalledWith(
      [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      { model: 'gpt-5', settings: { temperature: 0.2 } },
    );
    expect(tokenCounter.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ agentRunId: 'ai-tool:test', userId: 'u1', providerName: 'openai' }),
    );
  });

  it('falls back to Anthropic and honours AI_TOOLS_MODEL', async () => {
    vi.stubEnv('AI_TOOLS_MODEL', 'claude-sonnet-5');
    const { service, create } = makeService();
    await service.complete(req);
    expect(create).toHaveBeenCalledWith('anthropic', 'key', undefined, 'claude-sonnet-5');
  });

  it('explains when no provider is configured or no model is known', async () => {
    await expect(makeService({ resolveFails: true }).service.complete(req)).rejects.toThrow(
      /No AI provider is configured/,
    );
    await expect(makeService({ defaultProvider: 'custom' }).service.complete(req)).rejects.toThrow(
      /AI_TOOLS_MODEL/,
    );
  });

  it('still returns the reply if recording usage fails', async () => {
    const { service, tokenCounter } = makeService({ defaultProvider: 'openai' });
    tokenCounter.recordUsage.mockRejectedValueOnce(new Error('db down'));
    expect(await service.complete(req)).toBe('{"ok":true}');
  });
});

describe('OneShotLlmService.chat', () => {
  it('passes the conversation and tools through and returns the raw response', async () => {
    const { service, chat, tokenCounter } = makeService({ defaultProvider: 'openai' });
    const tools = [{ name: 't', description: 'd', inputSchema: {} }];
    const messages = [{ role: 'user' as const, content: 'hello' }];
    const result = await service.chat({ messages, userId: 'u1', usageTag: 'help', tools });
    expect(result).toBe(response);
    expect(chat).toHaveBeenCalledWith(messages, { model: 'gpt-5', tools });
    expect(tokenCounter.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ agentRunId: 'help' }),
    );
  });

  it('omits an empty tool list', async () => {
    const { service, chat } = makeService({ defaultProvider: 'openai' });
    await service.chat({ messages: [], userId: 'u1', usageTag: 'help', tools: [] });
    expect(chat).toHaveBeenCalledWith([], { model: 'gpt-5' });
  });
});
