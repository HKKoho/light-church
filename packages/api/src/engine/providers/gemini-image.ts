/**
 * Gemini image generation ("Nano Banana" image models) — one prompt in, one
 * image plus optional text out. Kept beside the chat providers so every
 * image call is made from engine/providers and its usage can be accounted.
 */

import { GoogleGenAI, Modality } from '@google/genai';
import type { LLMUsage } from '@clawix/shared';

export interface GeminiImageRequest {
  readonly apiKey: string;
  readonly apiBaseUrl?: string;
  readonly model: string;
  readonly prompt: string;
  /** e.g. "1:1", "3:4", "9:16", "16:9". */
  readonly aspectRatio: string;
}

export interface GeminiImageResult {
  readonly imageBase64: string;
  readonly mimeType: string;
  /** Any text the model returned beside the image (e.g. a caption). */
  readonly text: string;
  readonly usage: LLMUsage;
}

export async function generateGeminiImage(req: GeminiImageRequest): Promise<GeminiImageResult> {
  const client = new GoogleGenAI({
    apiKey: req.apiKey,
    ...(req.apiBaseUrl ? { httpOptions: { baseUrl: req.apiBaseUrl } } : {}),
  });
  const response = await client.models.generateContent({
    model: req.model,
    contents: req.prompt,
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
      imageConfig: { aspectRatio: req.aspectRatio },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const image = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!image?.data) {
    throw new Error('Gemini returned no image — try rewording the request');
  }
  const text = parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('\n')
    .trim();
  const meta = response.usageMetadata;
  const inputTokens = meta?.promptTokenCount ?? 0;
  const outputTokens = meta?.candidatesTokenCount ?? 0;
  return {
    imageBase64: image.data,
    mimeType: image.mimeType ?? 'image/png',
    text,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: meta?.totalTokenCount ?? inputTokens + outputTokens,
    },
  };
}
