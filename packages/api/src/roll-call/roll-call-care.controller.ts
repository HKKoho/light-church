// packages/api/src/roll-call/roll-call-care.controller.ts
//
// Self check-in (kiosk) and pastoral care. Care endpoints are for managers;
// the service enforces that.
import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  rollCallFollowUpSchema,
  rollCallKioskCheckInSchema,
  rollCallKioskLookupSchema,
} from '@clawix/shared';
import type {
  RollCallCareNoteInfo,
  RollCallCareQueue,
  RollCallCheckIn,
  RollCallFollowUpInput,
  RollCallKioskCheckInInput,
  RollCallKioskLookupInput,
  RollCallKioskMatch,
  RollCallKioskResult,
  RollCallMemberInfo,
} from '@clawix/shared';

import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { RollCallCareService } from './roll-call-care.service.js';
import { RollCallKioskService } from './roll-call-kiosk.service.js';
import { actor, ok, RollCallRoles, type AuthedRequest } from './roll-call.controller.js';

@ApiTags('roll-call')
@Controller('api/v1/roll-call')
@RollCallRoles()
export class RollCallCareController {
  constructor(
    private readonly kiosk: RollCallKioskService,
    private readonly care: RollCallCareService,
  ) {}

  @Post('groups/:id/kiosk/lookup')
  async lookup(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rollCallKioskLookupSchema)) body: RollCallKioskLookupInput,
  ): Promise<{ success: boolean; data: RollCallKioskMatch[] }> {
    return ok(await this.kiosk.lookup(id, body.sessionId, body.digits));
  }

  @Post('groups/:id/kiosk/check-in')
  async checkIn(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rollCallKioskCheckInSchema)) body: RollCallKioskCheckInInput,
  ): Promise<{ success: boolean; data: RollCallKioskResult }> {
    return ok(await this.kiosk.checkIn(id, body.sessionId, body.digits, body.memberId));
  }

  @Get('groups/:id/sessions/:sessionId/check-ins')
  async checkIns(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean; data: RollCallCheckIn[] }> {
    return ok(await this.kiosk.feed(id, sessionId));
  }

  @Get('care')
  async queue(@Req() req: AuthedRequest): Promise<{ success: boolean; data: RollCallCareQueue }> {
    return ok(await this.care.queue(actor(req)));
  }

  @Post('groups/:id/members/:memberId/follow-up')
  async followUp(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(rollCallFollowUpSchema)) body: RollCallFollowUpInput,
  ): Promise<{ success: boolean; data: RollCallMemberInfo }> {
    return ok(await this.care.followUp(id, memberId, body, actor(req)));
  }

  @Get('groups/:id/members/:memberId/care')
  async careLog(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ): Promise<{ success: boolean; data: RollCallCareNoteInfo[] }> {
    return ok(await this.care.careLog(id, memberId, actor(req)));
  }
}
