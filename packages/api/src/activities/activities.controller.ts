// packages/api/src/activities/activities.controller.ts
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
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { saveActivitySchema } from '@clawix/shared';
import type {
  ActivityAssetInfo,
  ActivityDetail,
  ActivitySummary,
  SaveActivityInput,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ActivitiesService } from './activities.service.js';

// Mission / Camp Companion. Referenced by main.ts, which raises the body limit
// for saving large activities (many devotionals).
export const ACTIVITIES_PATH = '/api/v1/activities';

interface AuthedRequest {
  user: JwtPayload;
}
const actor = (req: AuthedRequest) => ({ id: req.user.sub, role: req.user.role });

@ApiTags('activities')
@Controller('api/v1/activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  async list(): Promise<{ success: boolean; data: ActivitySummary[] }> {
    return { success: true, data: await this.service.list() };
  }

  @Get(':id')
  async get(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: ActivityDetail }> {
    return { success: true, data: await this.service.get(id, actor(req)) };
  }

  @Post()
  async create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(saveActivitySchema)) body: SaveActivityInput,
  ): Promise<{ success: boolean; data: ActivityDetail }> {
    return { success: true, data: await this.service.create(body, actor(req)) };
  }

  @Put(':id')
  async update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveActivitySchema)) body: SaveActivityInput,
  ): Promise<{ success: boolean; data: ActivityDetail }> {
    return { success: true, data: await this.service.update(id, body, actor(req)) };
  }

  @Post(':id/duplicate')
  async duplicate(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: ActivityDetail }> {
    return { success: true, data: await this.service.duplicate(id, actor(req)) };
  }

  @Delete(':id')
  async remove(@Req() req: AuthedRequest, @Param('id') id: string): Promise<{ success: boolean }> {
    await this.service.remove(id, actor(req));
    return { success: true };
  }

  // Multipart: one file (image, document or audio).
  @Post(':id/assets')
  async upload(
    @Req() req: FastifyRequest & AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: ActivityAssetInfo }> {
    const file = await req.file();
    if (!file) throw new BadRequestException('No file uploaded');
    const data = await file.toBuffer();
    return {
      success: true,
      data: await this.service.uploadAsset(
        id,
        { fileName: file.filename, mimeType: file.mimetype, data },
        actor(req),
      ),
    };
  }

  @Get(':id/assets/:assetId')
  async download(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const file = await this.service.readAsset(id, assetId);
    const inline = /^(image|audio)\//.test(file.mimeType) || file.mimeType === 'application/pdf';
    await reply
      .header('Content-Type', file.mimeType)
      .header('X-Content-Type-Options', 'nosniff')
      .header(
        'Content-Disposition',
        `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      )
      .send(file.data);
  }

  @Delete(':id/assets/:assetId')
  async deleteAsset(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('assetId') assetId: string,
  ): Promise<{ success: boolean }> {
    await this.service.deleteAsset(id, assetId, actor(req));
    return { success: true };
  }
}
