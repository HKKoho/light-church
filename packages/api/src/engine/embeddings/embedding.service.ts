// packages/api/src/engine/embeddings/embedding.service.ts
//
// Text → vector embeddings for the Theology Library (docs/RAGplan.md). Lives in
// the engine so, like every LLM call, it goes through the configured provider
// key and records token usage. Uses OpenAI's embeddings API whatever the
// church's default chat provider is — the vector column is fixed at 1536
// dimensions, so every stored chunk and every query must use the same model.
import { Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import { createLogger } from '@clawix/shared';

import { ProviderConfigService } from '../../provider-config/provider-config.service.js';
import { TokenCounterService } from '../token-counter.service.js';

const logger = createLogger('engine:embeddings');

export const EMBEDDING_PROVIDER = 'openai';
export const EMBEDDING_DIMENSIONS = 1536;
/** Inputs per API request (OpenAI allows up to 2048; smaller keeps requests modest). */
const BATCH_SIZE = 96;

export function embeddingModel(): string {
  return process.env['EMBEDDING_MODEL'] ?? 'text-embedding-3-small';
}

export interface EmbedRequest {
  readonly texts: readonly string[];
  readonly userId: string;
  /** Recorded as TokenUsage.agentRunId, e.g. `theology-library:ingest`. */
  readonly usageTag: string;
}

interface EmbeddingsClient {
  embeddings: Pick<OpenAI['embeddings'], 'create'>;
}
type ClientFactory = (apiKey: string, baseURL?: string) => EmbeddingsClient;

const defaultFactory: ClientFactory = (apiKey, baseURL) =>
  new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

@Injectable()
export class EmbeddingService {
  private readonly createClient: ClientFactory;

  constructor(
    private readonly providerConfig: ProviderConfigService,
    private readonly tokenCounter: TokenCounterService,
    @Optional() createClient?: ClientFactory,
  ) {
    this.createClient = createClient ?? defaultFactory;
  }

  /** One vector per input text, in the same order. */
  async embed(req: EmbedRequest): Promise<number[][]> {
    if (req.texts.length === 0) return [];
    const client = await this.client();
    const model = embeddingModel();
    const vectors: number[][] = [];
    let tokens = 0;

    for (let i = 0; i < req.texts.length; i += BATCH_SIZE) {
      const batch = req.texts.slice(i, i + BATCH_SIZE);
      const res = await client.embeddings.create({
        model,
        input: [...batch],
        dimensions: EMBEDDING_DIMENSIONS,
      });
      const ordered = [...res.data].sort((a, b) => a.index - b.index);
      if (ordered.length !== batch.length) {
        throw new Error(`Embedding API returned ${ordered.length} vectors for ${batch.length}`);
      }
      for (const item of ordered) vectors.push(item.embedding);
      tokens += res.usage?.prompt_tokens ?? 0;
    }

    await this.tokenCounter
      .recordAggregateUsage({
        usage: { inputTokens: tokens, outputTokens: 0, totalTokens: tokens },
        agentRunId: req.usageTag,
        userId: req.userId,
        providerName: EMBEDDING_PROVIDER,
        model,
      })
      .catch((err: unknown) => {
        logger.warn({ err, usageTag: req.usageTag }, 'Failed to record embedding usage');
      });

    return vectors;
  }

  async embedOne(text: string, userId: string, usageTag: string): Promise<number[]> {
    const [vector] = await this.embed({ texts: [text], userId, usageTag });
    if (!vector) throw new Error('Embedding API returned no vector');
    return vector;
  }

  private async client(): Promise<EmbeddingsClient> {
    try {
      const resolved = await this.providerConfig.resolveProvider(EMBEDDING_PROVIDER);
      return this.createClient(resolved.apiKey, resolved.apiBaseUrl ?? undefined);
    } catch (err) {
      logger.warn({ err }, 'No OpenAI key configured for embeddings');
      throw new ServiceUnavailableException(
        'The Theology Library needs an OpenAI key for search — ask an administrator',
      );
    }
  }
}
