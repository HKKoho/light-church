import OpenAI, { toFile } from 'openai';
import { createLogger } from '@clawix/shared';

const logger = createLogger('channels:telegram:transcription');

const TTS_MAX_CHARS = 4000;

export async function downloadTelegramFile(fileUrl: string): Promise<Buffer> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download file from Telegram: ${response.status} ${response.statusText}`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function transcribeAudio(audioBuffer: Buffer, apiKey: string): Promise<string> {
  const openai = new OpenAI({ apiKey });
  const file = await toFile(audioBuffer, 'voice.ogg', { type: 'audio/ogg' });
  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });
  const text = result.text.trim();
  logger.debug({ chars: text.length }, 'Whisper transcription complete');
  return text;
}

export async function generateSpeech(text: string, apiKey: string): Promise<Buffer> {
  const openai = new OpenAI({ apiKey });
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
