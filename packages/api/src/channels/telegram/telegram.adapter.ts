import { Bot, InputFile } from 'grammy';
import type { Message } from 'grammy/types';
import { createLogger } from '@clawix/shared';
import type {
  ChannelAdapter,
  ChannelAdapterConfig,
  InboundMessage,
  MessageHandler,
  OutboundMessage,
} from '@clawix/shared';

import { formatMarkdownV2 } from './telegram.formatter.js';
import {
  SAFE_SPLIT_LENGTH,
  TELEGRAM_MAX_MESSAGE_LENGTH,
  splitMessage,
} from '../utils/message-chunker.js';
import { downloadTelegramFile, transcribeAudio, generateSpeech } from './transcription.js';

const logger = createLogger('channels:telegram');

// Strip markdown so TTS doesn't read symbols aloud
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const extractReplyContext = (message: Message): InboundMessage['replyCtx'] => {
  if (!message?.reply_to_message || !message.reply_to_message.text) {
    return undefined;
  }
  const replyInfo = message.reply_to_message;
  return {
    from: replyInfo.from
      ? { isBot: replyInfo.from?.is_bot ?? false, id: replyInfo.from.id, date: replyInfo.date }
      : undefined,
    text: replyInfo.text!,
  };
};

/**
 * Create a Telegram channel adapter using grammy.
 * Supports polling (default) and webhook modes.
 */
export function createTelegramAdapter(config: ChannelAdapterConfig): ChannelAdapter {
  const botToken = config.config['bot_token'] as string | undefined;

  if (!botToken) {
    throw new Error(
      'Telegram bot token is required — set config.bot_token in the channel configuration',
    );
  }

  const mode = (config.config['mode'] as string | undefined) ?? 'polling';
  const bot = new Bot(botToken);
  let messageHandler: MessageHandler | null = null;

  // Track chats that sent voice — responses for these are buffered and TTS'd
  const voiceChats = new Set<string>();
  const voiceBuffers = new Map<string, string>();

  // Handle /start command
  bot.command('start', async (ctx) => {
    logger.info({ chatId: ctx.chat.id }, 'Received /start command');
    await ctx.reply(
      'Welcome to Clawix! Send me a message and I will route it to your assigned agent.',
    );
  });

  // Handle voice messages — transcribe via OpenAI Whisper then route as text
  bot.on('message:voice', async (ctx) => {
    if (!messageHandler) {
      logger.warn('No message handler registered, ignoring voice message');
      return;
    }

    const from = ctx.from;
    if (!from) return;

    const openaiApiKey = process.env['OPENAI_API_KEY'];
    if (!openaiApiKey) {
      logger.warn({ chatId: ctx.chat.id }, 'OPENAI_API_KEY not set — cannot transcribe voice');
      await ctx.reply(
        'Voice transcription requires an OpenAI API key. Contact your administrator.',
      );
      return;
    }

    try {
      const fileInfo = await ctx.getFile();
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;
      const audioBuffer = await downloadTelegramFile(fileUrl);
      const transcription = await transcribeAudio(audioBuffer, openaiApiKey);

      if (!transcription) {
        await ctx.reply(
          'Could not transcribe your voice message. Please try again or send a text message.',
        );
        return;
      }

      logger.info(
        { chatId: ctx.chat.id, chars: transcription.length },
        'Voice message transcribed',
      );

      await ctx.reply(`_🎤 "${transcription}"_`, { parse_mode: 'Markdown' });

      // Mark this chat for TTS reply
      voiceChats.add(String(from.id));
      voiceBuffers.set(String(from.id), '');

      const inbound: InboundMessage = {
        channelType: 'telegram',
        channelMessageId: String(ctx.message.message_id),
        senderId: String(from.id),
        senderName: [from.first_name, from.last_name].filter(Boolean).join(' '),
        text: transcription,
        timestamp: new Date(ctx.message.date * 1000),
      };

      await messageHandler(inbound);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error({ chatId: ctx.chat.id, error: errorMsg }, 'Voice transcription failed');
      await ctx.reply(
        'Failed to process your voice message. Please try again or send a text message.',
      );
    }
  });

  // Handle text messages
  bot.on('message:text', async (ctx) => {
    if (!messageHandler) {
      logger.warn('No message handler registered, ignoring message');
      return;
    }

    const from = ctx.from;
    if (!from) {
      return;
    }

    const inbound: InboundMessage = {
      channelType: 'telegram',
      channelMessageId: String(ctx.message.message_id),
      senderId: String(from.id),
      senderName: [from.first_name, from.last_name].filter(Boolean).join(' '),
      text: ctx.message.text,
      timestamp: new Date(ctx.message.date * 1000),
      replyCtx: extractReplyContext(ctx.message),
    };

    try {
      await messageHandler(inbound);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error({ chatId: ctx.chat.id, error: errorMsg }, 'Error handling message');
    }
  });

  const adapter: ChannelAdapter = {
    id: config.id,
    type: 'telegram',

    async connect(): Promise<void> {
      if (mode === 'webhook') {
        const webhookUrl = config.config['webhook_url'] as string | undefined;
        const secret = config.config['webhook_secret'] as string | undefined;

        if (!webhookUrl) {
          throw new Error('webhook_url is required in channel config for webhook mode');
        }

        logger.info({ webhookUrl }, 'Setting Telegram webhook');
        await bot.api.setWebhook(webhookUrl, {
          ...(secret ? { secret_token: secret } : {}),
        });

        // Note: Webhook HTTP endpoint (POST /api/telegram/webhook) must be
        // registered on the Fastify instance separately. For initial deployment,
        // use polling mode (default).
        logger.warn('Webhook mode: ensure POST /api/telegram/webhook route is registered');
      } else {
        logger.info('Starting Telegram bot in polling mode');
        bot.start({
          onStart: () => {
            logger.info('Telegram bot polling started');
          },
        });
      }
    },

    async disconnect(): Promise<void> {
      logger.info('Stopping Telegram bot');
      await bot.stop();
    },

    async sendMessage(message: OutboundMessage): Promise<void> {
      const chatId = message.recipientId;

      // Buffer response for voice-initiated chats — TTS'd in sendTypingStop
      if (voiceChats.has(chatId)) {
        voiceBuffers.set(chatId, (voiceBuffers.get(chatId) ?? '') + message.text + '\n');
        return;
      }

      const chunks = splitMessage(message.text, SAFE_SPLIT_LENGTH);

      if (chunks.length === 0) {
        return;
      }

      for (const chunk of chunks) {
        const formatted = formatMarkdownV2(chunk);

        if (formatted.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
          logger.warn(
            { chatId, rawLen: chunk.length, formattedLen: formatted.length },
            'MarkdownV2 expansion exceeded Telegram limit, sending chunk as plain text',
          );
          await bot.api.sendMessage(chatId, chunk);
          continue;
        }

        try {
          await bot.api.sendMessage(chatId, formatted, { parse_mode: 'MarkdownV2' });
        } catch {
          logger.warn({ chatId }, 'MarkdownV2 send failed, retrying as plain text');
          await bot.api.sendMessage(chatId, chunk);
        }
      }
    },

    async sendTyping(recipientId: string): Promise<void> {
      await bot.api.sendChatAction(recipientId, 'typing');
    },

    async sendTypingStop(recipientId: string): Promise<void> {
      if (!voiceChats.has(recipientId)) return;

      const bufferedText = voiceBuffers.get(recipientId) ?? '';
      voiceChats.delete(recipientId);
      voiceBuffers.delete(recipientId);

      const plain = stripMarkdown(bufferedText);
      if (!plain) return;

      const openaiApiKey = process.env['OPENAI_API_KEY'];
      if (!openaiApiKey) {
        // No TTS key — fall back to text
        const chunks = splitMessage(bufferedText, SAFE_SPLIT_LENGTH);
        for (const chunk of chunks) {
          try {
            await bot.api.sendMessage(recipientId, formatMarkdownV2(chunk), {
              parse_mode: 'MarkdownV2',
            });
          } catch {
            await bot.api.sendMessage(recipientId, chunk);
          }
        }
        return;
      }

      try {
        const audioBuffer = await generateSpeech(plain, openaiApiKey);
        await bot.api.sendVoice(recipientId, new InputFile(audioBuffer, 'response.ogg'));
        logger.info({ chatId: recipientId, chars: plain.length }, 'TTS voice reply sent');
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error({ chatId: recipientId, error: errorMsg }, 'TTS failed, falling back to text');
        const chunks = splitMessage(bufferedText, SAFE_SPLIT_LENGTH);
        for (const chunk of chunks) {
          try {
            await bot.api.sendMessage(recipientId, formatMarkdownV2(chunk), {
              parse_mode: 'MarkdownV2',
            });
          } catch {
            await bot.api.sendMessage(recipientId, chunk);
          }
        }
      }
    },

    onMessage(handler: MessageHandler): void {
      messageHandler = handler;
    },
  };

  return adapter;
}
