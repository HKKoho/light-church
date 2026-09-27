import { Module } from '@nestjs/common';

import { OneShotLlmModule } from '../engine/one-shot/one-shot-llm.module.js';
import { ChurchSiteImportService } from './church-site-import.service.js';
import { ChurchSiteController } from './church-site.controller.js';
import { ChurchSiteService } from './church-site.service.js';
import { MembersSiteController } from './members-site.controller.js';
import { PublicSiteController } from './public-site.controller.js';
import { SiteContentController } from './site-content.controller.js';
import { SiteContentService } from './site-content.service.js';
import { SystemSettingsModule } from '../system-settings/system-settings.module.js';

@Module({
  imports: [OneShotLlmModule, SystemSettingsModule],
  controllers: [
    ChurchSiteController,
    SiteContentController,
    MembersSiteController,
    PublicSiteController,
  ],
  providers: [ChurchSiteService, ChurchSiteImportService, SiteContentService],
})
export class ChurchSiteModule {}
