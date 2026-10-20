import OpenAI, { toFile } from 'openai';
import { createLogger } from '@clawix/shared';

const logger = createLogger('channels:telegram:transcription');

const TTS_MAX_CHARS = 4000;

/** OpenAI credentials for voice features, as resolved by ProviderConfigService. */
export interface OpenAICredentials {
  readonly apiKey: string;
  readonly apiBaseUrl: string | null;
}

/** Returns OpenAI credentials, or null when no OpenAI provider is configured. */
export type OpenAICredentialsResolver = () => Promise<OpenAICredentials | null>;

/** Fallback for callers without ProviderConfigService (e.g. tests): env var only. */
export const resolveOpenAIFromEnv: OpenAICredentialsResolver = () => {
  const apiKey = process.env['OPENAI_API_KEY'];
  return Promise.resolve(apiKey ? { apiKey, apiBaseUrl: null } : null);
};

function createClient({ apiKey, apiBaseUrl }: OpenAICredentials): OpenAI {
  return new OpenAI({ apiKey, ...(apiBaseUrl ? { baseURL: apiBaseUrl } : {}) });
}

export async function downloadTelegramFile(fileUrl: string): Promise<Buffer> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download file from Telegram: ${response.status} ${response.statusText}`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  credentials: OpenAICredentials,
): Promise<string> {
  const openai = createClient(credentials);
  const file = await toFile(audioBuffer, 'voice.ogg', { type: 'audio/ogg' });
  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });
  const text = result.text.trim();
  logger.debug({ chars: text.length }, 'Whisper transcription complete');
  return text;
}

export async function generateSpeech(
  text: string,
  credentials: OpenAICredentials,
): Promise<Buffer> {
  const openai = createClient(credentials);
  const input = text.length > TTS_MAX_CHARS ? text.slice(0, TTS_MAX_CHARS) + '…' : text;
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input,
    response_format: 'opus', // OGG/OPUS — native Telegram voice format
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  logger.debug({ chars: input.length, bytes: buffer.length }, 'TTS generation complete');
  return buffer;
}
