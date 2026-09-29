// packages/api/src/wisdom/wisdom-members.controller.ts
import { Body, Controller, Get, Param, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  saveWisdomAnswersSchema,
  type SaveWisdomAnswersInput,
  type WisdomMemberCourse,
  type WisdomMemberModule,
  type WisdomQuestionInsight,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { WisdomService } from './wisdom.service.js';

interface AuthedRequest {
  user: JwtPayload;
}

/** Any signed-in member: take published courses (Wisdom in Bible and Sunday School). */
@ApiTags('wisdom')
@Controller('api/v1/wisdom')
export class WisdomMembersController {
  constructor(private readonly wisdom: WisdomService) {}

  @Get('courses/:id')
  async course(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: WisdomMemberCourse }> {
    return { success: true, data: await this.wisdom.listForMember(id, req.user.sub) };
  }

  @Get('modules/:id')
  async get(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: WisdomMemberModule }> {
    return { success: true, data: await this.wisdom.getForMember(id, req.user.sub) };
  }

  @Put('modules/:id/answers')
  async save(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveWisdomAnswersSchema)) body: SaveWisdomAnswersInput,
  ): Promise<{ success: boolean; data: WisdomMemberModule }> {
    return { success: true, data: await this.wisdom.saveAnswers(id, req.user.sub, body) };
  }

  @Get('modules/:id/insight')
  async insight(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: WisdomQuestionInsight[] }> {
    return { success: true, data: await this.wisdom.insight(id, req.user.sub) };
  }
}
