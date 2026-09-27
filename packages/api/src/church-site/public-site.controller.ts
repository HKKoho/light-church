// packages/api/src/church-site/public-site.controller.ts
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { siteSlugSchema, type PublicChurchSite, type SitePageDetail } from '@clawix/shared';

import { Public } from '../auth/public.decorator.js';
import { ChurchSiteService } from './church-site.service.js';

export function parseSlug(raw: string | undefined): string {
  const result = siteSlugSchema.safeParse(raw ?? '');
  if (!result.success) throw new BadRequestException('Invalid page');
  return result.data;
}

/** Read-only data for the public site at /churchweb — public items only. */
@ApiTags('public-site')
@Controller('api/v1/public/site')
export class PublicSiteController {
  constructor(private readonly site: ChurchSiteService) {}

  @Public()
  @Get()
  async get(): Promise<{ success: boolean; data: PublicChurchSite }> {
    return { success: true, data: await this.site.publicSite() };
  }

  /** ?slug=about/faith — a query parameter, since slugs contain "/". */
  @Public()
  @Get('page')
  async page(@Query('slug') slug?: string): Promise<{ success: boolean; data: SitePageDetail }> {
    return { success: true, data: await this.site.pageBySlug(parseSlug(slug), false) };
  }
}
