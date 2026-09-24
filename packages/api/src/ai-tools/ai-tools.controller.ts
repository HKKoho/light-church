// packages/api/src/ai-tools/ai-tools.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { aiToolStorageSchema } from '@clawix/shared';
import type { AiToolDetail, AiToolStorageInput, AiToolSummary } from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { Roles } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { UserRole } from '../generated/prisma/enums.js';
import { AiToolsService } from './ai-tools.service.js';

@ApiTags('ai-tools')
@Controller('api/v1/ai-tools')
export class AiToolsController {
  constructor(private readonly aiToolsService: AiToolsService) {}

  @Get()
  async list(
    @Req() req: { user: JwtPayload },
  ): Promise<{ success: boolean; data: AiToolSummary[] }> {
    return { success: true, data: await this.aiToolsService.list(req.user.role) };
  }

  @Get(':name')
  async get(
    @Req() req: { user: JwtPayload },
    @Param('name') name: string,
  ): Promise<{ success: boolean; data: AiToolDetail }> {
    return { success: true, data: await this.aiToolsService.get(name, req.user.role) };
  }

  // The signed-in user's saved localStorage for an HTML tool (storage bridge).
  @Get(':name/storage')
  async getStorage(
    @Req() req: { user: JwtPayload },
    @Param('name') name: string,
  ): Promise<{ success: boolean; data: Record<string, string> }> {
    return {
      success: true,
      data: await this.aiToolsService.getStorage(name, req.user.sub, req.user.role),
    };
  }

  @Put(':name/storage')
  async putStorage(
    @Req() req: { user: JwtPayload },
    @Param('name') name: string,
    @Body(new ZodValidationPipe(aiToolStorageSchema)) body: AiToolStorageInput,
  ): Promise<{ success: boolean }> {
    await this.aiToolsService.putStorage(name, req.user.sub, req.user.role, body.data);
    return { success: true };
  }

  // Single sign-on hand-off for a link tool (e.g. Finance Pipeline): returns the
  // tool's SSO endpoint and a 60-second, single-use signed token for the viewer
  // to POST there. Only roles listed in the tool's tool.json may request one.
  @Post(':name/sso')
  async sso(
    @Req() req: { user: JwtPayload },
    @Param('name') name: string,
  ): Promise<{ success: boolean; data: { action: string; token: string } }> {
    const { sub, email, role } = req.user;
    return { success: true, data: await this.aiToolsService.ssoLaunch(name, { sub, email, role }) };
  }

  // Multipart: `name` field + one .html file. Re-uploading an existing name
  // replaces that tool's page.
  @Post()
  @Roles(UserRole.super_admin)
  async upload(@Req() req: FastifyRequest): Promise<{ success: boolean; data: AiToolSummary }> {
    const file = await req.file();
    if (!file) throw new BadRequestException('No file uploaded');
    const nameField = file.fields['name'];
    const name = nameField && 'value' in nameField ? String(nameField.value) : '';
    const buffer = await file.toBuffer();
    return { success: true, data: await this.aiToolsService.upload(name, file.filename, buffer) };
  }

  @Delete(':name')
  @Roles(UserRole.super_admin)
  async remove(@Param('name') name: string): Promise<{ success: boolean }> {
    await this.aiToolsService.remove(name);
    return { success: true };
  }
}
