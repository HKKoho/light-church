import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, ExternalServiceError } from '@clawix/shared';

const logger = createLogger('tts:piper');

const SYNTHESIZE_TIMEOUT_MS = 30_000;

export interface SynthesizeResult {
  readonly audio: Buffer;
  readonly sampleRate: number;
  readonly durationMs: number;
}

interface PiperSynthesizeResponse {
  readonly audio: string;
  readonly sampleRate: number;
  readonly durationMs: number;
}

@Injectable()
export class PiperTtsService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  async synthesize(text: string): Promise<SynthesizeResult> {
    const baseUrl = this.configService.get<string>('TTS_PIPER_URL');
    if (!baseUrl) {
      throw new ExternalServiceError('piper-tts', 'TTS_PIPER_URL is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, SYNTHESIZE_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`piper returned ${response.status}: ${body.slice(0, 500)}`);
      }

      const data = (await response.json()) as PiperSynthesizeResponse;
      return {
        audio: Buffer.from(data.audio, 'base64'),
        sampleRate: data.sampleRate,
        durationMs: data.durationMs,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ err }, 'Piper synthesis failed');
      throw new ExternalServiceError('piper-tts', message);
    } finally {
      clearTimeout(timeout);
    }
  }
}
