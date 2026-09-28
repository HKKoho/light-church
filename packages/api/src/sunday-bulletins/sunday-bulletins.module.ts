// packages/api/src/sunday-bulletins/sunday-bulletins.module.ts
import { Module } from '@nestjs/common';

import { BulletinArchiveModule } from '../bulletin-archive/bulletin-archive.module.js';
import { OneShotLlmModule } from '../engine/one-shot/one-shot-llm.module.js';
import { SundayBulletinsController } from './sunday-bulletins.controller.js';
import { SundayBulletinsService } from './sunday-bulletins.service.js';

@Module({
  imports: [BulletinArchiveModule, OneShotLlmModule],
  controllers: [SundayBulletinsController],
  providers: [SundayBulletinsService],
})
export class SundayBulletinsModule {}
