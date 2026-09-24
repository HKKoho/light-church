// packages/api/src/engine/local-llm/local-llm.service.ts
//
// A model served on this machine or the church's own network (Ollama), for
// features that handle personal data — e.g. Roll Call's member names — and so
// must never reach a cloud provider. The base URL is checked to be local or
// private before every call; anything else is refused.
import { isIP } from 'node:net';

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import { createLogger } from '@clawix/shared';

const logger = createLogger('engine:local-llm');

const DEFAULT_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen2.5vl:7b';
const TIMEOUT_MS = 180_000;
const STATUS_TIMEOUT_MS = 3_000;

export interface LocalLlmStatus {
  readonly available: boolean;
  readonly model: string;
  readonly reason: string | null;
}

/** True for loopback, private (RFC 1918 / ULA), link-local and Docker host names. */
export function isLocalHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host === 'host.docker.internal' || host.endsWith('.local')) {
    return true;
  }
  if (isIP(host) === 4) {
    const [a = 0, b = 0] = host.split('.').map(Number);
    return (
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }
  if (isIP(host) === 6) {
    return host === '::1' || /^f[cd]/.test(host) || host.startsWith('fe80:');
  }
  // A bare service name (e.g. "ollama" on the compose network) has no dots.
  return !host.includes('.');
}

@Injectable()
export class LocalLlmService {
  get model(): string {
    return process.env['LOCAL_LLM_MODEL'] ?? DEFAULT_MODEL;
  }

  /** The Ollama base URL, or an error message when it isn't local. */
  private baseUrl(): { url: URL } | { error: string } {
    const raw = process.env['LOCAL_LLM_URL'] ?? DEFAULT_URL;
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return { error: 'LOCAL_LLM_URL is not a valid URL' };
    }
    if (!isLocalHost(url.hostname)) {
      return { error: 'LOCAL_LLM_URL must point to this machine or a private network' };
    }
    return { url };
  }

  async status(): Promise<LocalLlmStatus> {
    const base = this.baseUrl();
    if ('error' in base) return { available: false, model: this.model, reason: base.error };
    try {
      const res = await fetch(new URL('/api/tags', base.url), {
        signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { models?: { name?: string }[] };
      const names = (body.models ?? []).map((m) => m.name ?? '');
      const wanted = this.model.includes(':') ? this.model : `${this.model}:latest`;
      if (!names.includes(wanted) && !names.includes(this.model)) {
        return {
          available: false,
          model: this.model,
          reason: `Model not installed — run: ollama pull ${this.model}`,
        };
      }
      return { available: true, model: this.model, reason: null };
    } catch {
      return { available: false, model: this.model, reason: 'Ollama is not reachable' };
    }
  }

  private client(): OpenAI {
    const base = this.baseUrl();
    if ('error' in base) throw new ServiceUnavailableException(base.error);
    return new OpenAI({
      apiKey: 'ollama', // Ollama ignores the key; the SDK requires one.
      baseURL: new URL('/v1', base.url).toString(),
      timeout: TIMEOUT_MS,
      maxRetries: 0,
    });
  }

  /**
   * One prompt (optionally with an image) → a JSON object. The model is asked
   * for JSON; the reply is parsed leniently (first {...} block).
   */
  async json(
    prompt: string,
    image?: { mimeType: string; data: Buffer },
  ): Promise<Record<string, unknown>> {
    const start = Date.now();
    let text: string;
    try {
      const res = await this.client().chat.completions.create({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: image
              ? [
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${image.mimeType};base64,${image.data.toString('base64')}`,
                    },
                  },
                  { type: 'text', text: prompt },
                ]
              : prompt,
          },
        ],
      });
      text = res.choices[0]?.message.content ?? '';
      logger.info(
        {
          model: this.model,
          inputTokens: res.usage?.prompt_tokens ?? 0,
          outputTokens: res.usage?.completion_tokens ?? 0,
          durationMs: Date.now() - start,
        },
        'local model call',
      );
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      logger.warn({ err, model: this.model }, 'local model call failed');
      throw new ServiceUnavailableException('The local AI model did not answer');
    }
    return parseJsonObject(text);
  }
}

export function parseJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return {};
  try {
    const value: unknown = JSON.parse(text.slice(start, end + 1));
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
