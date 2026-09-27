// packages/api/src/church-site/church-site.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  importChurchSiteSchema,
  saveSitePageSchema,
  updateChurchSiteSchema,
  type ChurchSiteInfo,
  type ImportChurchSiteInput,
  type SaveSitePageInput,
  type SitePageDetail,
  type SitePageSummary,
  type UpdateChurchSiteInput,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ChurchSiteImportService } from './church-site-import.service.js';
import type { Actor } from './church-site.roles.js';
import { ChurchSiteService } from './church-site.service.js';

interface AuthedRequest {
  user: JwtPayload;
}
const actor = (req: AuthedRequest): Actor => ({ id: req.user.sub, role: req.user.role });

/** Staff: import the church's website, then edit its settings and pages. */
@ApiTags('church-site')
@Controller('api/v1/church-site')
export class ChurchSiteController {
  constructor(
    private readonly site: ChurchSiteService,
    private readonly importer: ChurchSiteImportService,
  ) {}

  @Get()
  async get(@Req() req: AuthedRequest): Promise<{ success: boolean; data: ChurchSiteInfo }> {
    return { success: true, data: await this.site.getSite(actor(req)) };
  }

  @Put()
  async update(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(updateChurchSiteSchema)) body: UpdateChurchSiteInput,
  ): Promise<{ success: boolean; data: ChurchSiteInfo }> {
    return { success: true, data: await this.site.updateSite(body, actor(req)) };
  }

  /** Starts a background import; poll GET /church-site for importStatus. */
  @Post('import')
  async import(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(importChurchSiteSchema)) body: ImportChurchSiteInput,
  ): Promise<{ success: boolean }> {
    await this.importer.start(body.url, actor(req));
    return { success: true };
  }

  @Get('pages')
  async listPages(
    @Req() req: AuthedRequest,
  ): Promise<{ success: boolean; data: SitePageSummary[] }> {
    return { success: true, data: await this.site.listPages(actor(req)) };
  }

  @Get('pages/:id')
  async getPage(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: SitePageDetail }> {
    return { success: true, data: await this.site.getPage(id, actor(req)) };
  }

  @Post('pages')
  async createPage(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(saveSitePageSchema)) body: SaveSitePageInput,
  ): Promise<{ success: boolean; data: SitePageDetail }> {
    return { success: true, data: await this.site.createPage(body, actor(req)) };
  }

  @Put('pages/:id')
  async updatePage(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveSitePageSchema)) body: SaveSitePageInput,
  ): Promise<{ success: boolean; data: SitePageDetail }> {
    return { success: true, data: await this.site.updatePage(id, body, actor(req)) };
  }

  @Delete('pages/:id')
  async deletePage(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.site.deletePage(id, actor(req));
    return { success: true };
  }
}
