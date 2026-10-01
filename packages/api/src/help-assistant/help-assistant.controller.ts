// packages/api/src/help-assistant/help-assistant.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  PayloadTooLargeException,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { helpAssistantChatSchema } from '@clawix/shared';
import type { HelpAssistantChatResponse, HelpAssistantExtractResponse } from '@clawix/shared';
import type { z } from 'zod';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { extractDocumentText } from './document-text.js';
import { HelpAssistantService } from './help-assistant.service.js';

// Chat path is also referenced by main.ts, which raises the body limit for it:
// the browser resends the conversation plus any attached document text.
export const HELP_ASSISTANT_CHAT_PATH = '/api/v1/help-assistant/chat';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
// Every turn is an AI call, so keep a signed-in user to a sensible pace.
const CHAT_LIMIT = 30;
const CHAT_TTL_MS = 5 * 60 * 1000;

@ApiTags('help-assistant')
@Controller('api/v1/help-assistant')
export class HelpAssistantController {
  constructor(private readonly service: HelpAssistantService) {}

  @Throttle({ default: { limit: CHAT_LIMIT, ttl: CHAT_TTL_MS } })
  @Post('chat')
  @HttpCode(200)
  async chat(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(helpAssistantChatSchema))
    body: z.output<typeof helpAssistantChatSchema>,
  ): Promise<{ success: boolean; data: HelpAssistantChatResponse }> {
    return { success: true, data: await this.service.chat(req.user, body) };
  }

  /** Reads an attached document's text for the next chat turn; nothing is stored. */
  @Post('extract')
  @HttpCode(200)
  async extract(
    @Req() req: FastifyRequest,
  ): Promise<{ success: boolean; data: HelpAssistantExtractResponse }> {
    const file = await req.file();
    if (!file) throw new BadRequestException('No file uploaded');
    const buffer = await file.toBuffer();
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException('The file is larger than 15 MB');
    }
    const { text, truncated } = await extractDocumentText(file.filename, buffer);
    return { success: true, data: { name: file.filename, text, truncated } };
  }
}
