// packages/api/src/roll-call/roll-call.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  addRollCallMembersSchema,
  createRollCallSessionSchema,
  mergeRollCallMembersSchema,
  rollCallAiSettingsSchema,
  saveRollCallGroupSchema,
  saveRollCallSessionSchema,
  updateRollCallMemberSchema,
} from '@clawix/shared';
import type {
  AddRollCallMembersInput,
  CreateRollCallSessionInput,
  MergeRollCallMembersInput,
  RollCallAiSettingsInput,
  RollCallAiStatus,
  RollCallDuplicate,
  RollCallGroupDetail,
  RollCallGroupSummary,
  RollCallInsights,
  RollCallMemberInfo,
  RollCallSessionDetail,
  RollCallSessionSummary,
  RollCallSheetName,
  SaveRollCallGroupInput,
  SaveRollCallSessionInput,
  UpdateRollCallMemberInput,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { Roles } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { UserRole } from '../generated/prisma/enums.js';
import { RollCallAiService } from './roll-call-ai.service.js';
import { RollCallService } from './roll-call.service.js';

interface AuthedRequest {
  user: JwtPayload;
}
const actor = (req: AuthedRequest) => ({ id: req.user.sub, role: req.user.role });
const ok = <T>(data: T) => ({ success: true, data });

// Member names are personal data: only roles that take attendance get in.
@ApiTags('roll-call')
@Controller('api/v1/roll-call')
@Roles(
  UserRole.super_admin,
  UserRole.senior_pastor,
  UserRole.pastor,
  UserRole.admin_staff,
  UserRole.ministry_leader,
  UserRole.volunteer,
)
export class RollCallController {
  constructor(
    private readonly service: RollCallService,
    private readonly ai: RollCallAiService,
  ) {}

  @Get('ai')
  async aiStatus(): Promise<{ success: boolean; data: RollCallAiStatus }> {
    return ok(await this.ai.status());
  }

  @Put('ai')
  async setAi(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(rollCallAiSettingsSchema)) body: RollCallAiSettingsInput,
  ): Promise<{ success: boolean; data: RollCallAiStatus }> {
    return ok(await this.ai.setEnabled(body.enabled, actor(req)));
  }

  @Get('groups')
  async listGroups(): Promise<{ success: boolean; data: RollCallGroupSummary[] }> {
    return ok(await this.service.listGroups());
  }

  @Post('groups')
  async createGroup(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(saveRollCallGroupSchema)) body: SaveRollCallGroupInput,
  ): Promise<{ success: boolean; data: RollCallGroupDetail }> {
    return ok(await this.service.createGroup(body, actor(req)));
  }

  @Get('groups/:id')
  async getGroup(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: RollCallGroupDetail }> {
    return ok(await this.service.getGroup(id, actor(req)));
  }

  @Put('groups/:id')
  async updateGroup(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveRollCallGroupSchema)) body: SaveRollCallGroupInput,
  ): Promise<{ success: boolean; data: RollCallGroupDetail }> {
    return ok(await this.service.updateGroup(id, body, actor(req)));
  }

  @Delete('groups/:id')
  async deleteGroup(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.service.deleteGroup(id, actor(req));
    return { success: true };
  }

  @Post('groups/:id/members')
  async addMembers(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addRollCallMembersSchema)) body: AddRollCallMembersInput,
  ): Promise<{ success: boolean; data: RollCallMemberInfo[] }> {
    return ok(await this.service.addMembers(id, body.names));
  }

  @Put('groups/:id/members/:memberId')
  async updateMember(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateRollCallMemberSchema)) body: UpdateRollCallMemberInput,
  ): Promise<{ success: boolean; data: RollCallMemberInfo }> {
    return ok(await this.service.updateMember(id, memberId, body, actor(req)));
  }

  @Post('groups/:id/merge')
  async merge(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(mergeRollCallMembersSchema)) body: MergeRollCallMembersInput,
  ): Promise<{ success: boolean }> {
    await this.service.mergeMembers(id, body.keepId, body.mergeId, actor(req));
    return { success: true };
  }

  @Get('groups/:id/duplicates')
  async duplicates(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Query('ai') useAi?: string,
  ): Promise<{ success: boolean; data: RollCallDuplicate[] }> {
    return ok(await this.ai.duplicates(id, useAi === '1', actor(req)));
  }

  @Get('groups/:id/insights')
  async insights(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: RollCallInsights }> {
    return ok(await this.service.insights(id, actor(req)));
  }

  // Multipart: one photo of a sign-in sheet.
  @Post('groups/:id/read-sheet')
  async readSheet(
    @Req() req: FastifyRequest & AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: RollCallSheetName[] }> {
    const file = await req.file();
    if (!file) throw new BadRequestException('No photo uploaded');
    const data = await file.toBuffer();
    return ok(await this.ai.readSheet(id, { mimeType: file.mimetype, data }, actor(req)));
  }

  @Get('groups/:id/sessions')
  async listSessions(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: RollCallSessionSummary[] }> {
    return ok(await this.service.listSessions(id));
  }

  @Post('groups/:id/sessions')
  async createSession(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createRollCallSessionSchema)) body: CreateRollCallSessionInput,
  ): Promise<{ success: boolean; data: RollCallSessionDetail }> {
    return ok(await this.service.createSession(id, body));
  }

  @Get('groups/:id/sessions/:sessionId')
  async getSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean; data: RollCallSessionDetail }> {
    return ok(await this.service.getSession(id, sessionId));
  }

  @Put('groups/:id/sessions/:sessionId')
  async saveSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Body(new ZodValidationPipe(saveRollCallSessionSchema)) body: SaveRollCallSessionInput,
  ): Promise<{ success: boolean; data: RollCallSessionDetail }> {
    return ok(await this.service.saveSession(id, sessionId, body));
  }

  @Delete('groups/:id/sessions/:sessionId')
  async deleteSession(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean }> {
    await this.service.deleteSession(id, sessionId, actor(req));
    return { success: true };
  }
}
