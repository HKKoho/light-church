import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { eventPostSchema, qrRegistrationSchema } from '@clawix/shared';
import type {
  EventPostImage,
  EventPostInput,
  PublishedQrPage,
  QrRegistrationInput,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { QrRegistrationService, type Actor } from './qr-registration.service.js';

const actor = (req: { user: JwtPayload }): Actor => ({ id: req.user.sub, role: req.user.role });

@ApiTags('qr-registration')
@Controller('api/v1/qr-registration')
export class QrRegistrationController {
  constructor(private readonly service: QrRegistrationService) {}

  /** The page HTML, for an in-app preview and download before publishing. */
  @Post('preview')
  async preview(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(qrRegistrationSchema)) body: QrRegistrationInput,
  ): Promise<{ success: boolean; data: { html: string } }> {
    return { success: true, data: { html: await this.service.preview(body, actor(req)) } };
  }

  @Post('publish')
  async publish(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(qrRegistrationSchema)) body: QrRegistrationInput,
  ): Promise<{ success: boolean; data: PublishedQrPage }> {
    return { success: true, data: await this.service.publish(body, actor(req)) };
  }

  /** A post image for the event, designed by Gemini. */
  @Post('post')
  async post(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(eventPostSchema)) body: EventPostInput,
  ): Promise<{ success: boolean; data: EventPostImage }> {
    return { success: true, data: await this.service.designPost(body, actor(req)) };
  }
}
