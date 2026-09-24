// packages/api/src/engine/local-llm/__tests__/local-llm.service.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';

import { LocalLlmService, isLocalHost, parseJsonObject } from '../local-llm.service.js';

describe('isLocalHost', () => {
  it.each([
    'localhost',
    '127.0.0.1',
    '10.1.2.3',
    '172.20.0.5',
    '192.168.1.9',
    '::1',
    '[::1]',
    'host.docker.internal',
    'ollama',
    'mac-mini.local',
  ])('accepts %s', (host) => expect(isLocalHost(host)).toBe(true));

  it.each(['api.openai.com', '8.8.8.8', '172.32.0.1', 'localhost.evil.com', '2001:4860::8888'])(
    'refuses %s',
    (host) => expect(isLocalHost(host)).toBe(false),
  );
});

describe('parseJsonObject', () => {
  it('reads the first JSON object in a reply', () => {
    expect(parseJsonObject('Sure! {"names": ["陳大文"]} Done.')).toEqual({ names: ['陳大文'] });
    expect(parseJsonObject('no json')).toEqual({});
    expect(parseJsonObject('{broken')).toEqual({});
  });
});

describe('LocalLlmService', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('refuses a cloud URL before sending anything', async () => {
    vi.stubEnv('LOCAL_LLM_URL', 'https://api.openai.com');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const llm = new LocalLlmService();
    expect((await llm.status()).available).toBe(false);
    await expect(llm.json('hi')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports a missing model', async () => {
    vi.stubEnv('LOCAL_LLM_URL', 'http://localhost:11434');
    vi.stubEnv('LOCAL_LLM_MODEL', 'qwen2.5vl');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ models: [{ name: 'qwen2.5vl:7b' }] }))),
    );
    const status = await new LocalLlmService().status();
    expect(status).toMatchObject({ available: false, model: 'qwen2.5vl' });
    expect(status.reason).toContain('ollama pull qwen2.5vl');
  });

  it('is available when the model is installed', async () => {
    vi.stubEnv('LOCAL_LLM_URL', 'http://localhost:11434');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ models: [{ name: 'qwen2.5vl:7b' }] }))),
    );
    expect(await new LocalLlmService().status()).toEqual({
      available: true,
      model: 'qwen2.5vl:7b',
      reason: null,
    });
  });
});
