import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { generateSurveySchema, surveyDraftSchema } from '@clawix/shared';
import type { GenerateSurveyInput, PublishedSurvey, SurveyDraft } from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AiSurveyService, type Actor } from './ai-survey.service.js';

const actor = (req: { user: JwtPayload }): Actor => ({
  id: req.user.sub,
  role: req.user.role,
  email: req.user.email || null,
});

@ApiTags('ai-survey')
@Controller('api/v1/ai-survey')
export class AiSurveyController {
  constructor(private readonly service: AiSurveyService) {}

  @Post('generate')
  async generate(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(generateSurveySchema)) body: GenerateSurveyInput,
  ): Promise<{ success: boolean; data: SurveyDraft }> {
    return { success: true, data: await this.service.generate(body, actor(req)) };
  }

  @Post('publish')
  async publish(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(surveyDraftSchema)) body: SurveyDraft,
  ): Promise<{ success: boolean; data: PublishedSurvey }> {
    return { success: true, data: await this.service.publish(body, actor(req)) };
  }
}
