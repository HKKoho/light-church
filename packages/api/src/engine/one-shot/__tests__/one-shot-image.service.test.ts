import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: mockGenerateContent } };
  }),
  Modality: { IMAGE: 'IMAGE', TEXT: 'TEXT' },
}));

import type { ProviderConfigService } from '../../../provider-config/provider-config.service.js';
import type { TokenCounterService } from '../../token-counter.service.js';
import { OneShotImageService } from '../one-shot-image.service.js';

const request = { prompt: 'A poster', aspectRatio: '1:1', userId: 'u1', usageTag: 'ai-tool:x' };

function makeService(resolve: () => Promise<{ apiKey: string; apiBaseUrl: string | null }>) {
  const providerConfig = { resolveProvider: vi.fn(resolve) };
  const tokenCounter = { recordUsage: vi.fn(async () => undefined) };
  return {
    service: new OneShotImageService(
      providerConfig as unknown as ProviderConfigService,
      tokenCounter as unknown as TokenCounterService,
    ),
    providerConfig,
    tokenCounter,
  };
}

const withKey = async () => ({ apiKey: 'k', apiBaseUrl: null });

describe('OneShotImageService', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('returns the image and caption and records usage against Gemini', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              { text: 'thinking', thought: true },
              { inlineData: { data: 'aW1n', mimeType: 'image/jpeg' } },
              { text: 'Join us!' },
            ],
          },
        },
      ],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 1290, totalTokenCount: 1300 },
    });
    const { service, providerConfig, tokenCounter } = makeService(withKey);

    const result = await service.generate(request);

    expect(result).toEqual({
      imageBase64: 'aW1n',
      mimeType: 'image/jpeg',
      text: 'Join us!',
      usage: { inputTokens: 10, outputTokens: 1290, totalTokens: 1300 },
    });
    expect(providerConfig.resolveProvider).toHaveBeenCalledWith('gemini');
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: 'A poster',
        config: expect.objectContaining({ imageConfig: { aspectRatio: '1:1' } }),
      }),
    );
    expect(tokenCounter.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ providerName: 'gemini', agentRunId: 'ai-tool:x', userId: 'u1' }),
    );
  });

  it('explains when no Gemini key is configured', async () => {
    const { service } = makeService(async () => {
      throw new Error('missing');
    });
    await expect(service.generate(request)).rejects.toThrow(/Gemini is not configured/);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('surfaces a reply without an image as a gateway error', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: 'Sorry' }] } }],
    });
    const { service, tokenCounter } = makeService(withKey);
    await expect(service.generate(request)).rejects.toThrow(/no image/);
    expect(tokenCounter.recordUsage).not.toHaveBeenCalled();
  });
});
