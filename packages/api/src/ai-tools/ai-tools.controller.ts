// packages/api/src/ai-tools/ai-tools.controller.ts
import { BadRequestException, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { AiToolDetail, AiToolSummary } from '@clawix/shared';

import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { AiToolsService } from './ai-tools.service.js';

@ApiTags('ai-tools')
@Controller('api/v1/ai-tools')
export class AiToolsController {
  constructor(private readonly aiToolsService: AiToolsService) {}

  @Get()
  async list(): Promise<{ success: boolean; data: AiToolSummary[] }> {
    return { success: true, data: await this.aiToolsService.list() };
  }

  @Get(':name')
  async get(@Param('name') name: string): Promise<{ success: boolean; data: AiToolDetail }> {
    return { success: true, data: await this.aiToolsService.get(name) };
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
