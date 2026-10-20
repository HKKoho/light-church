import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTelegramAdapter } from '../telegram/telegram.adapter.js';
import { resolveOpenAIFromEnv } from '../telegram/transcription.js';
import type { OpenAICredentials } from '../telegram/transcription.js';
import type { ChannelAdapterConfig } from '@clawix/shared';

type Handler = (ctx: unknown) => Promise<void>;
const handlers = new Map<string, Handler>();
const sendMessageMock = vi.fn().mockResolvedValue({});
const sendVoiceMock = vi.fn().mockResolvedValue({});

vi.mock('grammy', () => ({
  Bot: vi.fn().mockImplementation(function () {
    return {
      on: vi.fn((event: string, handler: Handler) => handlers.set(event, handler)),
      command: vi.fn(),
      api: { sendMessage: sendMessageMock, sendVoice: sendVoiceMock },
    };
  }),
  InputFile: vi.fn(),
}));

const transcribeAudioMock = vi.fn().mockResolvedValue('hello from voice');
const generateSpeechMock = vi.fn().mockResolvedValue(Buffer.from('ogg'));

vi.mock('../telegram/transcription.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../telegram/transcription.js')>()),
  downloadTelegramFile: vi.fn().mockResolvedValue(Buffer.from('audio')),
  transcribeAudio: (...args: unknown[]) => transcribeAudioMock(...args),
  generateSpeech: (...args: unknown[]) => generateSpeechMock(...args),
}));

const config: ChannelAdapterConfig = {
  id: 'channel-1',
  type: 'telegram',
  name: 'Test Bot',
  config: { bot_token: 'test-token-123' },
};

function voiceCtx(): { ctx: unknown; reply: ReturnType<typeof vi.fn> } {
  const reply = vi.fn().mockResolvedValue({});
  const ctx = {
    chat: { id: 42 },
    from: { id: 42, first_name: 'Ada' },
    message: { message_id: 1, date: 1_700_000_000 },
    getFile: vi.fn().mockResolvedValue({ file_path: 'voice/file.ogg' }),
    reply,
  };
  return { ctx, reply };
}

describe('Telegram voice credentials', () => {
  const credentials: OpenAICredentials = { apiKey: 'db-key', apiBaseUrl: 'https://proxy.test/v1' };

  beforeEach(() => {
    handlers.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('transcribes and replies with TTS using resolver-provided credentials', async () => {
    const resolveOpenAI = vi.fn().mockResolvedValue(credentials);
    const adapter = createTelegramAdapter(config, resolveOpenAI);
    const handler = vi.fn().mockResolvedValue(undefined);
    adapter.onMessage(handler);

    await handlers.get('message:voice')!(voiceCtx().ctx);

    expect(transcribeAudioMock).toHaveBeenCalledWith(expect.any(Buffer), credentials);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello from voice' }));

    await adapter.sendMessage({ channelType: 'telegram', recipientId: '42', text: 'answer' });
    await adapter.sendTypingStop!('42');

    expect(generateSpeechMock).toHaveBeenCalledWith('answer', credentials);
    expect(sendVoiceMock).toHaveBeenCalledOnce();
  });

  it('tells the user voice is unavailable when no OpenAI provider is configured', async () => {
    const adapter = createTelegramAdapter(config, vi.fn().mockResolvedValue(null));
    adapter.onMessage(vi.fn());
    const { ctx, reply } = voiceCtx();

    await handlers.get('message:voice')!(ctx);

    expect(transcribeAudioMock).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(expect.stringContaining('requires an OpenAI API key'));
  });

  it('defaults to the OPENAI_API_KEY env var when no resolver is given', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'env-key');
    await expect(resolveOpenAIFromEnv()).resolves.toEqual({ apiKey: 'env-key', apiBaseUrl: null });

    vi.stubEnv('OPENAI_API_KEY', '');
    await expect(resolveOpenAIFromEnv()).resolves.toBeNull();
  });
});
