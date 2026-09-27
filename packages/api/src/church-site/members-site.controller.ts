// packages/api/src/church-site/members-site.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { MembersChurchSite, SitePageDetail } from '@clawix/shared';

import { ChurchSiteService } from './church-site.service.js';
import { parseSlug } from './public-site.controller.js';
import { SiteContentService } from './site-content.service.js';

/** Any signed-in member: the site's members-only pages, events and media. */
@ApiTags('church-site')
@Controller('api/v1/church-site/members')
export class MembersSiteController {
  constructor(
    private readonly site: ChurchSiteService,
    private readonly content: SiteContentService,
  ) {}

  @Get()
  async get(): Promise<{ success: boolean; data: MembersChurchSite }> {
    const [pages, events, media] = await Promise.all([
      this.site.membersPages(),
      this.content.upcomingEvents(['members']),
      this.content.mediaFor(['members']),
    ]);
    return { success: true, data: { pages, events, media } };
  }

  /** A public or members-only page, e.g. ?slug=members/handbook. */
  @Get('page')
  async page(@Query('slug') slug?: string): Promise<{ success: boolean; data: SitePageDetail }> {
    return { success: true, data: await this.site.pageBySlug(parseSlug(slug), true) };
  }
}
