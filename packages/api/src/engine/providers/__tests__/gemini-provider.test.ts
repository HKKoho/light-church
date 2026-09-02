import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: mockGenerateContent } };
  }),
}));

vi.mock('@clawix/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clawix/shared')>();
  return {
    ...actual,
    createLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  };
});

import { GeminiProvider } from '../gemini-provider.js';

describe('GeminiProvider', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('has name "gemini"', () => {
    const provider = new GeminiProvider('test-key');
    expect(provider.name).toBe('gemini');
  });

  it('throws when constructed without an API key', () => {
    expect(() => new GeminiProvider('')).toThrow(/api key/i);
  });

  it('sends a basic chat and returns a normalized LLMResponse', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: 'Hello!' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    });

    const provider = new GeminiProvider('test-key');
    const result = await provider.chat([{ role: 'user', content: 'Hi' }]);

    expect(result.content).toBe('Hello!');
    expect(result.finishReason).toBe('stop');
    expect(result.usage.inputTokens).toBe(10);
    expect(result.usage.outputTokens).toBe(5);
    expect(result.toolCalls).toEqual([]);
  });

  it('passes systemInstruction when a system message is present', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
    });

    const provider = new GeminiProvider('test-key');
    await provider.chat([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
    ]);

    const args = mockGenerateContent.mock.calls[0]![0];
    expect(args.config.systemInstruction).toBe('You are helpful.');
    expect(args.contents).toEqual([{ role: 'user', parts: [{ text: 'Hello' }] }]);
  });

  it('does not pass systemInstruction when no system message is present', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
    });

    const provider = new GeminiProvider('test-key');
    await provider.chat([{ role: 'user', content: 'Hi' }]);

    const args = mockGenerateContent.mock.calls[0]![0];
    expect(args.config).not.toHaveProperty('systemInstruction');
  });

  it('passes tools and forwards generation settings', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
    });

    const provider = new GeminiProvider('test-key');
    await provider.chat([{ role: 'user', content: 'Hi' }], {
      tools: [
        {
          name: 'search',
          description: 'Search the web',
          inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
        },
      ],
      settings: { temperature: 0.3, maxTokens: 1000, topP: 0.9, stopSequences: ['END'] },
    });

    const args = mockGenerateContent.mock.calls[0]![0];
    expect(args.config.tools).toEqual([
      {
        functionDeclarations: [
          {
            name: 'search',
            description: 'Search the web',
            parameters: { type: 'object', properties: { q: { type: 'string' } } },
          },
        ],
      },
    ]);
    expect(args.config.temperature).toBe(0.3);
    expect(args.config.maxOutputTokens).toBe(1000);
    expect(args.config.topP).toBe(0.9);
    expect(args.config.stopSequences).toEqual(['END']);
  });

  it('forwards the model from options, falling back to gemini-3-flash-preview', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
    });

    const provider = new GeminiProvider('test-key');
    await provider.chat([{ role: 'user', content: 'Hi' }]);
    expect(mockGenerateContent.mock.calls[0]![0].model).toBe('gemini-3-flash-preview');

    await provider.chat([{ role: 'user', content: 'Hi' }], { model: 'gemini-3-pro-preview' });
    expect(mockGenerateContent.mock.calls[1]![0].model).toBe('gemini-3-pro-preview');
  });

  it('extracts tool calls and maps tool_use finish reason', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [{ functionCall: { name: 'search', args: { q: 'x' } } }],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
    });

    const provider = new GeminiProvider('test-key');
    const result = await provider.chat([{ role: 'user', content: 'Search' }], {
      tools: [
        {
          name: 'search',
          description: 'Search',
          inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
        },
      ],
    });

    expect(result.finishReason).toBe('tool_use');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]!.name).toBe('search');
  });

  it('normalizes API_KEY_INVALID errors to a readable message', async () => {
    const apiErr = new Error('API_KEY_INVALID: bad key');
    (apiErr as { status?: number }).status = 401;
    mockGenerateContent.mockRejectedValueOnce(apiErr);

    const provider = new GeminiProvider('bad-key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
      /Gemini auth failed/,
    );
  });

  it('normalizes 429 quota errors', async () => {
    const apiErr = new Error('Quota exceeded');
    (apiErr as { status?: number }).status = 429;
    mockGenerateContent.mockRejectedValueOnce(apiErr);

    const provider = new GeminiProvider('test-key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
      /Gemini rate limit/,
    );
  });

  it('normalizes 400 schema rejections', async () => {
    const apiErr = new Error('Invalid argument: schema rejected');
    (apiErr as { status?: number }).status = 400;
    mockGenerateContent.mockRejectedValueOnce(apiErr);

    const provider = new GeminiProvider('test-key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
      /Gemini request rejected/,
    );
  });

  it('returns LLMResponse with finishReason="error" on SAFETY finish (does not throw)', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 0 },
    });

    const provider = new GeminiProvider('test-key');
    const result = await provider.chat([{ role: 'user', content: 'Hi' }]);
    expect(result.finishReason).toBe('error');
    expect(result.content).toBeNull();
  });

  it('bubbles up network/5xx errors raw', async () => {
    const netErr = new Error('ECONNRESET');
    mockGenerateContent.mockRejectedValueOnce(netErr);

    const provider = new GeminiProvider('test-key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow('ECONNRESET');
  });

  it('surfaces undici fetch failure cause (e.g. ENOTFOUND) in the error message', async () => {
    const cause = Object.assign(
      new Error('getaddrinfo ENOTFOUND generativelanguage.googleapis.com'),
      {
        code: 'ENOTFOUND',
      },
    );
    const fetchErr = new TypeError('fetch failed', { cause });
    mockGenerateContent.mockRejectedValueOnce(fetchErr);

    const provider = new GeminiProvider('test-key');
    const promise = provider.chat([{ role: 'user', content: 'Hi' }]);

    await expect(promise).rejects.toThrow(/Gemini network error/);
    await expect(promise).rejects.toThrow(/ENOTFOUND/);
  });

  it('wraps undici fetch failure into a new Error preserving the original cause', async () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), {
      code: 'ECONNREFUSED',
    });
    const fetchErr = new TypeError('fetch failed', { cause });
    mockGenerateContent.mockRejectedValueOnce(fetchErr);

    const provider = new GeminiProvider('test-key');
    let caught: unknown;
    try {
      await provider.chat([{ role: 'user', content: 'Hi' }]);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBe(fetchErr);
    expect((caught as Error).message).toMatch(/ECONNREFUSED/);
    expect((caught as { cause?: unknown }).cause).toBe(cause);
  });

  it('roundtrips thought signatures across two consecutive chat() calls', async () => {
    // First call returns a tool call with a thoughtSignature
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: 'search',
                  args: { q: 'cats' },
                  thoughtSignature: 'sig-roundtrip-xyz',
                },
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
    });
    // Second call returns plain text
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: 'Done' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 1 },
    });

    const provider = new GeminiProvider('test-key');

    const first = await provider.chat([{ role: 'user', content: 'Search for cats' }], {
      tools: [
        {
          name: 'search',
          description: 'Search',
          inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
        },
      ],
    });

    // Build the next-turn message history including the assistant tool call and a tool result
    const tc = first.toolCalls[0]!;
    await provider.chat(
      [
        { role: 'user', content: 'Search for cats' },
        { role: 'assistant', content: '', toolCalls: [tc] },
        { role: 'tool', toolCallId: tc.id, content: '{"results":[]}' },
      ],
      {
        tools: [
          {
            name: 'search',
            description: 'Search',
            inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
          },
        ],
      },
    );

    // Inspect the second outbound payload — the assistant turn must carry the signature
    const secondCallArgs = mockGenerateContent.mock.calls[1]![0];
    const assistantTurn = secondCallArgs.contents[1];
    expect(assistantTurn.role).toBe('model');
    expect(assistantTurn.parts[0].functionCall.thoughtSignature).toBe('sig-roundtrip-xyz');
  });
});
