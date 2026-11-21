// packages/api/src/engine/embeddings/__tests__/embedding.service.test.ts
import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProviderConfigService } from '../../../provider-config/provider-config.service.js';
import type { TokenCounterService } from '../../token-counter.service.js';
import { EmbeddingService, embeddingModel } from '../embedding.service.js';

function make(opts: { noKey?: boolean } = {}) {
  const create = vi.fn(async ({ input }: { input: string[] }) => ({
    // Out of order on purpose: the service must sort by index.
    data: input.map((_, i) => ({ index: i, embedding: [i] })).reverse(),
    usage: { prompt_tokens: input.length * 10 },
  }));
  const providerConfig = {
    resolveProvider: vi.fn(async () => {
      if (opts.noKey) throw new Error('no key');
      return { apiKey: 'sk-test', apiBaseUrl: null };
    }),
  };
  const tokenCounter = { recordAggregateUsage: vi.fn(async () => undefined) };
  const factory = vi.fn(() => ({ embeddings: { create } }));
  const service = new EmbeddingService(
    providerConfig as unknown as ProviderConfigService,
    tokenCounter as unknown as TokenCounterService,
    factory as never,
  );
  return { service, create, tokenCounter, factory, providerConfig };
}

describe('EmbeddingService', () => {
  afterEach(() => {
    delete process.env['EMBEDDING_MODEL'];
  });

  it('embeds in batches, keeps input order and records usage once', async () => {
    const { service, create, tokenCounter, factory } = make();
    const texts = Array.from({ length: 100 }, (_, i) => `t${i}`);
    const vectors = await service.embed({ texts, userId: 'u1', usageTag: 'tag' });

    expect(factory).toHaveBeenCalledWith('sk-test', undefined);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      model: 'text-embedding-3-small',
      dimensions: 1536,
    });
    expect(vectors).toHaveLength(100);
    expect(vectors[0]).toEqual([0]);
    expect(vectors[96]).toEqual([0]); // first of the second batch
    expect(vectors[95]).toEqual([95]);
    expect(tokenCounter.recordAggregateUsage).toHaveBeenCalledWith({
      usage: { inputTokens: 1000, outputTokens: 0, totalTokens: 1000 },
      agentRunId: 'tag',
      userId: 'u1',
      providerName: 'openai',
      model: 'text-embedding-3-small',
    });
  });

  it('skips the API for no texts', async () => {
    const { service, providerConfig } = make();
    expect(await service.embed({ texts: [], userId: 'u1', usageTag: 'tag' })).toEqual([]);
    expect(providerConfig.resolveProvider).not.toHaveBeenCalled();
  });

  it('embeds one text', async () => {
    const { service } = make();
    expect(await service.embedOne('grace', 'u1', 'tag')).toEqual([0]);
  });

  it('explains a missing OpenAI key', async () => {
    const { service } = make({ noKey: true });
    await expect(service.embedOne('grace', 'u1', 'tag')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('still returns vectors when usage recording fails', async () => {
    const { service, tokenCounter } = make();
    tokenCounter.recordAggregateUsage.mockRejectedValueOnce(new Error('db down'));
    expect(await service.embedOne('grace', 'u1', 'tag')).toEqual([0]);
  });

  it('honours EMBEDDING_MODEL', () => {
    process.env['EMBEDDING_MODEL'] = 'text-embedding-3-large';
    expect(embeddingModel()).toBe('text-embedding-3-large');
  });
});
