import { Module } from '@nestjs/common';

import { OneShotLlmModule } from '../engine/one-shot/one-shot-llm.module.js';
import { ChurchSiteImportService } from './church-site-import.service.js';
import { ChurchSiteController } from './church-site.controller.js';
import { ChurchSiteService } from './church-site.service.js';
import { PublicSiteController } from './public-site.controller.js';

@Module({
  imports: [OneShotLlmModule],
  controllers: [ChurchSiteController, PublicSiteController],
  providers: [ChurchSiteService, ChurchSiteImportService],
})
export class ChurchSiteModule {}
