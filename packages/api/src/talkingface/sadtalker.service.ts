import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, ExternalServiceError } from '@clawix/shared';

const logger = createLogger('talkingface:sadtalker');

const GENERATE_TIMEOUT_MS = 60_000;

export interface GenerateVideoResult {
  /** Raw MP4 video buffer for one sentence. */
  readonly video: Buffer;
}

/**
 * HTTP client for the SadTalker Python sidecar.
 *
 * Expected sidecar contract:
 *   POST /generate
 *   multipart/form-data:
 *     image — portrait photo (JPEG or PNG)
 *     audio — WAV audio chunk from Piper
 *   Response: application/octet-stream MP4 video
 *
 * Run the sidecar with:
 *   docker run -p 7860:7860 sadtalker-service   (see infra/docker/sadtalker/)
 * Set SADTALKER_URL in .env, e.g. http://localhost:7860
 */
@Injectable()
export class SadTalkerService {
  private readonly baseUrl: string;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('SADTALKER_URL');
  }

  /**
   * Generates a lip-synced MP4 video from a portrait photo and a WAV audio buffer.
   * The caller is responsible for ensuring both inputs are valid.
   */
  async generateVideo(imageBuffer: Buffer, audioBuffer: Buffer): Promise<GenerateVideoResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

    // Write buffers to temp files — FormData requires File/Blob objects or
    // readable streams in Node, and the sidecar expects named multipart parts.
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sadtalker-'));
    const imagePath = path.join(tmpDir, 'avatar.jpg');
    const audioPath = path.join(tmpDir, 'audio.wav');

    try {
      await Promise.all([
        fs.writeFile(imagePath, imageBuffer),
        fs.writeFile(audioPath, audioBuffer),
      ]);

      const form = new FormData();
      form.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'avatar.jpg');
      form.append('audio', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');

      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`SadTalker returned ${response.status}: ${body.slice(0, 500)}`);
      }

      const video = Buffer.from(await response.arrayBuffer());
      return { video };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ err }, 'SadTalker video generation failed');
      throw new ExternalServiceError('sadtalker', message);
    } finally {
      clearTimeout(timeout);
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }
}
