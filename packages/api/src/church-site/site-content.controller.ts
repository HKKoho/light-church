// packages/api/src/church-site/site-content.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  saveSiteEventSchema,
  saveSiteMediaSchema,
  type SaveSiteEventInput,
  type SaveSiteMediaInput,
  type SiteEventInfo,
  type SiteMediaInfo,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { Actor } from './church-site.roles.js';
import { SiteContentService } from './site-content.service.js';

interface AuthedRequest {
  user: JwtPayload;
}
const actor = (req: AuthedRequest): Actor => ({ id: req.user.sub, role: req.user.role });

/** Staff: events and media on the church's site. */
@ApiTags('church-site')
@Controller('api/v1/church-site')
export class SiteContentController {
  constructor(private readonly content: SiteContentService) {}

  @Get('events')
  async listEvents(
    @Req() req: AuthedRequest,
  ): Promise<{ success: boolean; data: SiteEventInfo[] }> {
    return { success: true, data: await this.content.listEvents(actor(req)) };
  }

  @Post('events')
  async createEvent(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(saveSiteEventSchema)) body: SaveSiteEventInput,
  ): Promise<{ success: boolean; data: SiteEventInfo }> {
    return { success: true, data: await this.content.createEvent(body, actor(req)) };
  }

  @Put('events/:id')
  async updateEvent(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveSiteEventSchema)) body: SaveSiteEventInput,
  ): Promise<{ success: boolean; data: SiteEventInfo }> {
    return { success: true, data: await this.content.updateEvent(id, body, actor(req)) };
  }

  @Delete('events/:id')
  async deleteEvent(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.content.deleteEvent(id, actor(req));
    return { success: true };
  }

  @Get('media')
  async listMedia(@Req() req: AuthedRequest): Promise<{ success: boolean; data: SiteMediaInfo[] }> {
    return { success: true, data: await this.content.listMedia(actor(req)) };
  }

  @Post('media')
  async createMedia(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(saveSiteMediaSchema)) body: SaveSiteMediaInput,
  ): Promise<{ success: boolean; data: SiteMediaInfo }> {
    return { success: true, data: await this.content.createMedia(body, actor(req)) };
  }

  @Put('media/:id')
  async updateMedia(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveSiteMediaSchema)) body: SaveSiteMediaInput,
  ): Promise<{ success: boolean; data: SiteMediaInfo }> {
    return { success: true, data: await this.content.updateMedia(id, body, actor(req)) };
  }

  @Delete('media/:id')
  async deleteMedia(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.content.deleteMedia(id, actor(req));
    return { success: true };
  }
}
