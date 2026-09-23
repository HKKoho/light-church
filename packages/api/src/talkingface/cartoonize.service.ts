import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, ExternalServiceError } from '@clawix/shared';

const logger = createLogger('talkingface:cartoonize');

const GENERATE_TIMEOUT_MS = 30_000;

/**
 * AnimeGANv2 checkpoint variants the sidecar ships pretrained weights for
 * (see infra/docker/cartoonize/). Not the Hayao/Shinkai style names from the
 * original TensorFlow AnimeGANv2 repo — docs/self2talkface.md documents the
 * deviation.
 */
export const CARTOON_STYLES = [
  'face_paint_v2',
  'face_paint_v1',
  'celeba_distill',
  'paprika',
] as const;
export type CartoonStyle = (typeof CARTOON_STYLES)[number];

export function isCartoonStyle(value: unknown): value is CartoonStyle {
  return typeof value === 'string' && (CARTOON_STYLES as readonly string[]).includes(value);
}

export interface CartoonizeResult {
  /** Cartoonized portrait, JPEG-encoded. */
  readonly image: Buffer;
}

/**
 * HTTP client for the cartoonize Python sidecar.
 *
 * Expected sidecar contract:
 *   POST /generate
 *   multipart/form-data:
 *     image — source photo (JPEG/PNG/WebP)
 *     style — one of CARTOON_STYLES
 *   Response: image/jpeg cartoonized portrait
 *
 * Run the sidecar with:
 *   docker run -p 7861:7861 cartoonize-service   (see infra/docker/cartoonize/)
 * Set CARTOONIZE_URL in .env, e.g. http://localhost:7861
 */
@Injectable()
export class CartoonizeService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  /**
   * Converts a source photo into a cartoon/anime-style portrait.
   * The caller is responsible for ensuring the image and style are valid.
   */
  async generate(imageBuffer: Buffer, style: CartoonStyle): Promise<CartoonizeResult> {
    // Read lazily (like SADTALKER_URL / TTS_PIPER_URL) so an unconfigured
    // sidecar only fails cartoon requests instead of stopping the API booting.
    const baseUrl = this.configService.get<string>('CARTOONIZE_URL');
    if (!baseUrl) {
      throw new ExternalServiceError('cartoonize', 'CARTOONIZE_URL is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

    try {
      const form = new FormData();
      form.append(
        'image',
        new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }),
        'source.jpg',
      );
      form.append('style', style);

      const response = await fetch(`${baseUrl}/generate`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Cartoonize sidecar returned ${response.status}: ${body.slice(0, 500)}`);
      }

      const image = Buffer.from(await response.arrayBuffer());
      return { image };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ err }, 'Cartoonize generation failed');
      throw new ExternalServiceError('cartoonize', message);
    } finally {
      clearTimeout(timeout);
    }
  }
}
