// packages/api/src/wisdom/wisdom-members.controller.ts
import { Body, Controller, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  askWisdomMichaelSchema,
  saveWisdomAnswersSchema,
  type AskWisdomMichaelData,
  type SaveWisdomAnswersInput,
  type WisdomMichaelReply,
  type WisdomMemberCourse,
  type WisdomMemberModule,
  type WisdomQuestionInsight,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { WisdomMichaelService } from './wisdom-michael.service.js';
import { WisdomService } from './wisdom.service.js';

// Every Michael question is an AI call, so keep a member to a sensible pace.
const MICHAEL_LIMIT = 30;
const MICHAEL_TTL_MS = 5 * 60 * 1000;

interface AuthedRequest {
  user: JwtPayload;
}

/** Any signed-in member: take published courses (Wisdom in Bible and Sunday School). */
@ApiTags('wisdom')
@Controller('api/v1/wisdom')
export class WisdomMembersController {
  constructor(
    private readonly wisdom: WisdomService,
    private readonly michael: WisdomMichaelService,
  ) {}

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

  /** Ask Michael, the teaching assistant, about the lesson step the member is on. */
  @Throttle({ default: { limit: MICHAEL_LIMIT, ttl: MICHAEL_TTL_MS } })
  @Post('modules/:id/michael')
  @HttpCode(200)
  async askMichael(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(askWisdomMichaelSchema)) body: AskWisdomMichaelData,
  ): Promise<{ success: boolean; data: WisdomMichaelReply }> {
    return { success: true, data: await this.michael.ask(id, req.user.sub, body) };
  }
}
